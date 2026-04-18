// export const getRetailPostsForConsumer = async (req, res) => {
  
//   try {
//     const { district, thana } = req.query;

//     const posts = await SellPost.find({
//       sellType: "retail",
//       isActive: true,
//       district,
//       thana,
//     })
//       .populate("product", "productName image category")
//       .populate("seller", "name phone")
//       .sort({ createdAt: -1 });

//     res.json({ message: "Retail posts fetched", posts });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



import SellPost from "../../models/SellPost.js";

export const getRetailPostsForConsumer = async (req, res) => {
  try {
    const { district, thana } = req.query;

    if (!district || !thana) {
      return res.status(400).json({
        message: "district and thana are required",
      });
    }

    const posts = await SellPost.find({
      sellType: "retail",
      isActive: true,
      district,
      thana,
    })
      .populate("product", "productName image category pricePerKg")
      .populate("seller", "name phone district thana role")
      .sort({ createdAt: -1 });

    res.json({
      message: "Retail posts fetched successfully",
      posts,
    });
  } catch (error) {
    console.error("Retail post fetch error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};