import Cart from "../models/Cart.js";

// POST /api/cart/add
export const addToCart = async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  try {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // Create a new cart
      cart = new Cart({
        userId,
        items: [{ productId, quantity }]
      });
    } else {
      // Check if product already in cart
      const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

      if (itemIndex > -1) {
        // Update quantity
        cart.items[itemIndex].quantity += quantity;
      } else {
        // Add new product
        cart.items.push({ productId, quantity });
      }
    }

    await cart.save();
    res.status(200).json({ message: 'Product added to cart', cart });

  } catch (error) {
    res.status(500).json({ message: 'Error adding to cart', error: error.message });
  }
};


// GET /api/cart
export const getCart = async (req, res) => {
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return res.status(200).json({ items: [], message: 'Cart is empty' });

    res.status(200).json({ items: cart.items });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart', error: error.message });
  }
};


// DELETE /api/cart/remove/:productId
export const deleteFromCart = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Filter out the product to delete
    const updatedItems = cart.items.filter(
      item => item.productId.toString() !== productId
    );

    if (updatedItems.length === cart.items.length) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    cart.items = updatedItems;
    await cart.save();

    res.status(200).json({ message: 'Product removed from cart', cart });
  } catch (error) {
    res.status(500).json({ message: 'Error removing from cart', error: error.message });
  }
};


// PUT /api/addToCart/update
export const updateQuantityInCart = async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  if (!productId || quantity == null) {
    return res.status(400).json({ message: 'Product ID and quantity are required' });
  }

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    return res.status(200).json({ message: 'Cart quantity updated', cart });
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

