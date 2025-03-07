import User from "../models/User.js";

// Consumer Dashboard
export const consumerDashboard = async (req, res) => {
  try {
    if (req.user.role !== "consumer") {
      return res.status(403).json({ message: "Access Denied: Consumers only" });
    }

    // Fetch consumer-specific data (Example: Orders, Transactions, etc.)
    res.json({ message: "Welcome to Consumer Dashboard", data: {} });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Wholesaler Dashboard
export const wholesalerDashboard = async (req, res) => {
  try {
    if (req.user.role !== "wholesaler") {
      return res
        .status(403)
        .json({ message: "Access Denied: Wholesalers only" });
    }

    // Fetch wholesaler-specific data (Example: Bulk Orders, Sales Stats, etc.)
    res.json({ message: "Welcome to Wholesaler Dashboard", data: {} });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Super Seller Dashboard
export const supersellerDashboard = async (req, res) => {
  try {
    if (req.user.role !== "superseller") {
      return res
        .status(403)
        .json({ message: "Access Denied: Supersellers only" });
    }

    // Fetch superseller-specific data (Example: High-value Orders, Payouts, etc.)
    res.json({ message: "Welcome to Super Seller Dashboard", data: {} });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Producer Dashboard
export const producerDashboard = async (req, res) => {
  try {
    if (req.user.role !== "producer") {
      return res.status(403).json({ message: "Access Denied: Producers only" });
    }

    // Fetch producer-specific data (Example: Inventory, Manufacturing Reports, etc.)
    res.json({ message: "Welcome to Producer Dashboard", data: {} });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin Dashboard
export const adminDashboard = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied: Admins only" });
    }

    // Fetch admin-specific data (Example: User Management, Revenue Reports, etc.)
    res.json({ message: "Welcome to Admin Dashboard", data: {} });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
