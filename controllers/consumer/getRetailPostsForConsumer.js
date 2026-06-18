import SellPost from "../../models/SellPost.js";

// export const getRetailPostsForConsumer = async (req, res) => {
//   try {
//     const { district, thana } = req.query;

//     const filter = {
//       sellType: "retail",
//       isActive: true,
//     };

//     // Optional filter
//     if (district) {
//       filter.district = district;
//     }

//     if (thana) {
//       filter.thana = thana;
//     }

//     const posts = await SellPost.find(filter)
//       .populate("product", "productName image category price pricePerKg")
//       .populate("seller", "name phone district thana role")
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       message: "Retail posts fetched successfully",
//       total: posts.length,
//       posts,
//     });
//   } catch (error) {
//     console.error("Retail post fetch error:", error);

//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };


export const getRetailPostsForConsumer = async (req, res) => {
  try {
    const { district, thana } = req.query;

    const filter = {
      sellType: "retail",
      visibility: "consumer",
      isActive: true,
    };

    if (district) {
      filter.district = district;
    }

    if (thana) {
      filter.thana = thana;
    }

    const posts = await SellPost.find(filter)
      .populate(
        "product",
        "productName image category price pricePerKg productType"
      )
      .populate(
        "seller",
        "name phone district thana role"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Retail posts fetched successfully",
      total: posts.length,
      posts,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



export const getSingleRetailProductForConsumer = async (req, res) => {
  try {
    const { productId } = req.params;

    const post = await SellPost.findOne({
      product: productId,
      sellType: "retail",
      visibility: "consumer",
      isActive: true,
    })
      .populate(
        "product",
        `
        productName
        image
        secondaryImages
        description
        category
        quantity
        price
        pricePerKg
        productType
        `
      )
      .populate(
        "seller",
        `
        name
        phone
        district
        thana
        role
        `
      );

    if (!post) {
      return res.status(404).json({
        message: "Retail product not found",
      });
    }

    return res.status(200).json({
      message: "Retail product fetched successfully",
      post,
    });
  } catch (error) {
    console.error(
      "getSingleRetailProductForConsumer error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};