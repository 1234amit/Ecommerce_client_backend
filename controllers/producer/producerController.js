import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import Product from "../../models/Product.js";
import Notification from "../../models/Notification.js";

// Get Producer Profile
export const getProducerProfile = async (req, res) => {
  try {
    const producerId = req.user.id; // Extract user ID from token
    const producer = await User.findById(producerId).select("-password"); // Exclude password field

    if (!producer) {
      return res.status(404).json({ message: "Producer not found" });
    }

    res.json({ message: "Producer profile fetched successfully", producer });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Producer Profile
export const updateProducerProfile = async (req, res) => {
  try {
    const producerId = req.user.id; // Extract user ID from token
    const { name, email, phone, division, district, thana, address, nid } =
      req.body;

    // Update only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (division) updateData.division = division;
    if (district) updateData.district = district;
    if (thana) updateData.thana = thana;
    if (address) updateData.address = address;
    if (nid) updateData.nid = nid;

    // Handle image upload if file is provided
    if (req.file) {
      // Create full URL for the image
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      updateData.image = `${baseUrl}/${req.file.path}`;
    }

    const updatedProducer = await User.findByIdAndUpdate(
      producerId,
      { $set: updateData },
      { new: true, runValidators: true, select: "-password" } // Exclude password field
    );

    if (!updatedProducer) {
      return res.status(404).json({ message: "Producer not found" });
    }

    res.json({
      message: "Profile updated successfully",
      producer: updatedProducer,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Producer Profile Image Only
export const updateProducerProfileImage = async (req, res) => {
  try {
    const producerId = req.user.id; // Extract user ID from token

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Create full URL for the image
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/${req.file.path}`;

    const updatedProducer = await User.findByIdAndUpdate(
      producerId,
      { image: imageUrl },
      { new: true, runValidators: true, select: "-password" } // Exclude password field
    );

    if (!updatedProducer) {
      return res.status(404).json({ message: "Producer not found" });
    }

    res.json({
      message: "Profile image updated successfully",
      producer: updatedProducer,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Change Producer Password
export const changeProducerPassword = async (req, res) => {
  try {
    const producerId = req.user.id; // Extract user ID from token
    const { oldPassword, newPassword } = req.body;

    // Find user
    const producer = await User.findById(producerId);
    if (!producer) {
      return res.status(404).json({ message: "Producer not found" });
    }

    // Check if old password is correct
    const isMatch = await bcrypt.compare(oldPassword, producer.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Check if new password is different from old password
    if (oldPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "New password must be different from old password" });
    }

    // Assign new password (Mongoose `pre("save")` middleware will hash it)
    producer.password = newPassword;
    await producer.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add Product by Producer
export const addProduct = async (req, res) => {
  try {
    // Debug log to check req.user
    console.log('req.user:', req.user);
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: No user found in request. Check your authentication middleware.' });
    }
    const producerId = req.user._id;
    const {
      productName,
      quantity,
      price,
      description,
      category,
      addToSellPost,
      image, // This will be a string (URL)
      secondaryImages // This can be a string or array of strings (URLs)
    } = req.body;

    // Validate required fields
    if (!productName || !quantity || !price || !description || !category || !image) {
      return res.status(400).json({ 
        message: "All fields (including image URL) are required" 
      });
    }

    // Handle secondaryImages as array or string
    let secondaryImagesArr = [];
    if (secondaryImages) {
      if (Array.isArray(secondaryImages)) {
        secondaryImagesArr = secondaryImages;
      } else if (typeof secondaryImages === 'string') {
        secondaryImagesArr = [secondaryImages];
      }
    }

    const newProduct = new Product({
      producer: producerId,
      image: String(image),
      secondaryImages: secondaryImagesArr.map(img => String(img)),
      productName: String(productName),
      quantity: String(quantity),
      price: String(price),
      previousPrice: String(price),
      priceHistory: [{
        price: String(price),
        changedAt: new Date()
      }],
      description: String(description),
      category: String(category),
      addToSellPost: String(addToSellPost || 'no'),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({ 
      message: "Product added successfully", 
      product: savedProduct 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get All Products for Producer
export const getAllProducts = async (req, res) => {
  try {
    // Get producer ID from the verified user
    const producerId = req.user._id; // Changed from req.user.id to req.user._id

    console.log('Producer ID:', producerId); // Debug log

    // Find all products that belong to this producer
    const products = await Product.find({ producer: producerId });
    
    console.log('Found products:', products); // Debug log

    if (!products || products.length === 0) {
      return res.json({ 
        message: "No products found for this producer", 
        products: [] 
      });
    }

    res.json({ 
      message: "Products fetched successfully", 
      products 
    });
  } catch (error) {
    console.error('Error in getAllProducts:', error); // Debug log
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get Single Product by ID for Producer
export const getProductById = async (req, res) => {
  try {
    const producerId = req.user.id; // Get producer ID from token
    const { productId } = req.params;

    // Find product by ID and ensure it belongs to the producer
    const product = await Product.findOne({
      _id: productId,
      producer: producerId,
    });

    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found or not authorized" });
    }

    res.json({ message: "Product fetched successfully", product });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//update all product by id 
export const updateProductById = async (req, res) => {
  try {
    const producerId = req.user.id;
    const { productId } = req.params;
    const {
      productName,
      quantity,
      price,
      description,
      category,
      addToSellPost,
      image, // Accept as string
      secondaryImages // Accept as array of strings or string
    } = req.body;

    // Find product and ensure it belongs to the producer
    const product = await Product.findOne({
      _id: productId,
      producer: producerId,
    });

    if (!product) {
      return res.status(404).json({ 
        message: "Product not found or not authorized" 
      });
    }

    // Handle main image if provided (as string)
    if (image !== undefined) {
      if (typeof image !== 'string') {
        return res.status(400).json({ message: "Image must be a string (file path or URL)" });
      }
      product.image = String(image);
    }

    // Handle secondary images if provided (as array of strings or string)
    if (secondaryImages !== undefined) {
      let secondaryImagesArr = [];
      if (Array.isArray(secondaryImages)) {
        secondaryImagesArr = secondaryImages;
      } else if (typeof secondaryImages === 'string') {
        secondaryImagesArr = [secondaryImages];
      } else {
        return res.status(400).json({ message: "secondaryImages must be an array of strings or a string" });
      }
      product.secondaryImages = secondaryImagesArr.map(img => String(img));
    }

    // Update only provided fields with string conversion
    if (productName) product.productName = String(productName);
    if (quantity) product.quantity = String(quantity);
    
    // Handle price update with history tracking
    if (price) {
      const newPrice = String(price);
      if (newPrice !== product.price) {
        // Store current price as previous before updating
        product.previousPrice = product.price;
        product.price = newPrice;
        
        // Initialize priceHistory if it doesn't exist
        if (!product.priceHistory) {
          product.priceHistory = [];
        }
        
        // Add to price history
        product.priceHistory.push({
          price: newPrice,
          changedAt: new Date()
        });
      }
    }
    
    if (description) product.description = String(description);
    if (category) product.category = String(category);
    if (addToSellPost !== undefined) product.addToSellPost = String(addToSellPost);
    
    // Update the updatedAt timestamp
    product.updatedAt = new Date();

    // Save the product and explicitly select all fields including previousPrice and priceHistory
    const updatedProduct = await product.save();

    // Return the complete product data
    res.json({
      message: "Product updated successfully",
      product: {
        ...updatedProduct.toObject(),
        previousPrice: updatedProduct.previousPrice || updatedProduct.price,
        priceHistory: updatedProduct.priceHistory || [{
          price: updatedProduct.price,
          changedAt: updatedProduct.updatedAt
        }]
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Delete Product by ID
export const deleteProductById = async (req, res) => {
  try {
    const producerId = req.user.id;
    const { productId } = req.params;

    // Find product and ensure it belongs to the producer
    const product = await Product.findOne({
      _id: productId,
      producer: producerId,
    });

    if (!product) {
      return res.status(404).json({ 
        message: "Product not found or not authorized" 
      });
    }

    // Delete the product
    await Product.findByIdAndDelete(productId);

    res.json({
      message: "Product deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get all notifications for producer
export const getNotifications = async (req, res) => {
  try {
    const producerId = req.user.id;

    // Find all notifications for this producer, sorted by newest first
    const notifications = await Notification.find({ recipient: producerId })
      .sort({ createdAt: -1 });

    res.json({
      message: "Notifications fetched successfully",
      notifications
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const producerId = req.user.id;
    const { notificationId } = req.params;

    // Find notification and ensure it belongs to the producer
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: producerId
    });

    if (!notification) {
      return res.status(404).json({ 
        message: "Notification not found or not authorized" 
      });
    }

    // Mark as read
    notification.isRead = true;
    await notification.save();

    res.json({
      message: "Notification marked as read",
      notification
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const producerId = req.user.id;

    // Update all unread notifications for this producer
    const result = await Notification.updateMany(
      { 
        recipient: producerId,
        isRead: false 
      },
      { 
        $set: { isRead: true } 
      }
    );

    res.json({
      message: "All notifications marked as read",
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get unread notifications count
export const getUnreadNotificationsCount = async (req, res) => {
  try {
    const producerId = req.user.id;

    // Count unread notifications
    const count = await Notification.countDocuments({
      recipient: producerId,
      isRead: false
    });

    res.json({
      message: "Unread notifications count fetched successfully",
      unreadCount: count
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

