import Category from "../../models/Category.js";
import Product from "../../models/Product.js";

export const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .select("name icon createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Categories fetched successfully",
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("getAdminCategories error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const createAdminCategory = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const icon = String(req.body?.icon || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    if (!icon) {
      return res.status(400).json({ message: "Category icon is required" });
    }

    const existing = await Category.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    });

    if (existing) {
      return res.status(409).json({ message: "Category already exists" });
    }

    const category = await Category.create({ name, icon });

    return res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("createAdminCategory error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateAdminCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const name = String(req.body?.name || "").trim();
    const icon = String(req.body?.icon || "").trim();

    const updateData = {};
    if (name) updateData.name = name;
    if (icon) updateData.icon = icon;

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ message: "No category data provided" });
    }

    if (name) {
      const existing = await Category.findOne({
        _id: { $ne: categoryId },
        name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
      });

      if (existing) {
        return res.status(409).json({ message: "Category already exists" });
      }
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("updateAdminCategory error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const deleteAdminCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const usedByProduct = await Product.exists({ category: categoryId });
    if (usedByProduct) {
      return res.status(409).json({
        message: "Category is used by products and cannot be deleted",
      });
    }

    const category = await Category.findByIdAndDelete(categoryId);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({
      message: "Category deleted successfully",
      category,
    });
  } catch (error) {
    console.error("deleteAdminCategory error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
