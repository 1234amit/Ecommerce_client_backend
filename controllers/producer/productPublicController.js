// controllers/product/productPublicController.js
import mongoose from "mongoose";
import Product from "../../models/Product.js";
import Category from "../../models/Category.js";

const { Types: { ObjectId } } = mongoose;
const isOid = (v) => ObjectId.isValid(String(v));

/** Build filters for list endpoints, tolerant to mixed category storage */
async function buildFilters(query) {
  const { q, category, minPrice, maxPrice } = query;

  const filters = {
    // show only products intended for public
    addToSellPost: { $regex: "^yes", $options: "i" }, // matches "yes", "Yes", "yes 4", etc.
  };

  // Text search (basic)
  if (q) {
    filters.$or = [
      { productName: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  // Category may be an ObjectId, a Category name, or a raw string stored in Product
  if (category) {
    if (isOid(category)) {
      filters.category = new ObjectId(category);
    } else {
      // Try to resolve by category name first
      const catDoc = await Category.findOne({
        name: { $regex: `^${category}$`, $options: "i" },
      }).select("_id").lean();

      if (catDoc) {
        filters.category = catDoc._id;
      } else {
        // Fall back: your DB might have stored the category as plain string on Product
        filters.category = category;
      }
    }
  }

  // NOTE: Your schema stores price as String. Filtering numerically will be lexicographic.
  // Keep this only if you accept that limitation for now.
  if (minPrice || maxPrice) {
    filters.price = {};
    if (minPrice) filters.price.$gte = String(minPrice);
    if (maxPrice) filters.price.$lte = String(maxPrice);
  }

  return filters;
}

/** Replace Product.category with populated doc when it's an ObjectId.
 *  If it's a string, expose it as categoryName. */
async function hydrateCategories(docs) {
  const oids = [];
  for (const d of docs) {
    if (isOid(d.category)) oids.push(new ObjectId(String(d.category)));
  }
  const uniq = [...new Set(oids.map(String))].map((s) => new ObjectId(s));

  const catDocs = uniq.length
    ? await Category.find({ _id: { $in: uniq } }).select("name icon").lean()
    : [];
  const catMap = new Map(catDocs.map((c) => [String(c._id), c]));

  return docs.map((d) => {
    if (isOid(d.category)) {
      const cat = catMap.get(String(d.category));
      return { ...d, category: cat || d.category, categoryName: cat?.name };
    }
    // category is a plain string on the product
    return { ...d, categoryName: d.category };
  });
}

/**
 * GET /api/v1/products
 * Public list with pagination/search/sort.
 */
export const listProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sort = "-createdAt", // "price", "-price", "createdAt", "-createdAt"
    } = req.query;

    const filters = await buildFilters(req.query);
    const skip = (Number(page) - 1) * Number(limit);

    const docs = await Product.find(filters)
      .select("productName quantity price previousPrice image secondaryImages description category producer createdAt updatedAt")
      .populate({ path: "producer", select: "name division district thana" }) // safe to populate
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const items = await hydrateCategories(docs);
    const total = await Product.countDocuments(filters);

    res.json({
      message: "Products fetched",
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      products: items,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/v1/products/:productId
 * Public single product.
 */
export const getProductPublic = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isOid(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const doc = await Product.findOne({
      _id: new ObjectId(productId),
      addToSellPost: { $regex: "^yes", $options: "i" },
    })
      .select("productName quantity price previousPrice image secondaryImages description category producer createdAt updatedAt")
      .populate({ path: "producer", select: "name division district thana" })
      .lean();

    if (!doc) return res.status(404).json({ message: "Product not found" });

    const [item] = await hydrateCategories([doc]);
    res.json({ message: "Product fetched", product: item });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/v1/products/by-producer/:producerId
 * Public list for a specific producer page.
 */
export const listByProducer = async (req, res) => {
  try {
    const { producerId } = req.params;
    const { page = 1, limit = 12, sort = "-createdAt" } = req.query;

    if (!isOid(producerId)) {
      return res.status(400).json({ message: "Invalid producer id" });
    }

    const filters = {
      producer: new ObjectId(producerId),
      addToSellPost: { $regex: "^yes", $options: "i" },
    };

    const skip = (Number(page) - 1) * Number(limit);

    const docs = await Product.find(filters)
      .select("productName quantity price previousPrice image secondaryImages description category producer createdAt updatedAt")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const items = await hydrateCategories(docs);
    const total = await Product.countDocuments(filters);

    res.json({
      message: "Producer products fetched",
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      products: items,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/v1/categories
 * Public endpoint to get all categories - accessible by all users
 */
export const getPublicCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .select("name icon description createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      message: "Categories fetched successfully",
      count: categories.length,
      categories
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
