import mongoose from "mongoose";
import Product from "../models/Product.js";
import User from "../models/User.js";
import SellPost from "../models/SellPost.js";
import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";
import Review from "../models/Review.js";
import SupersalerBuyProductCart from "../models/supersalerBuyProductCart.js";
import SupersalerStock from "../models/SupersalerStock.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import Chat from "../models/Chats/Chat.js";
import DeviceSession from "../models/DeviceSession.js";

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

export const cleanupProductReferences = async (productId) => {
  const id = toObjectId(productId);
  const sellPosts = await SellPost.find({ product: id }).select("_id").lean();
  const sellPostIds = sellPosts.map((post) => post._id);
  const now = new Date();

  const results = await Promise.allSettled([
    SellPost.deleteMany({ product: id }),
    Cart.updateMany(
      { "items.productId": id },
      { $pull: { items: { productId: id } } },
    ),
    SupersalerBuyProductCart.updateMany(
      { "items.product": id },
      { $pull: { items: { product: id } } },
    ),
    Wishlist.deleteMany({ productId: id }),
    Review.deleteMany({ productId: id }),
    SupersalerStock.deleteMany({ product: id }),
    Product.updateMany({ sourceProduct: id }, { $set: { sourceProduct: null } }),
    Transaction.updateMany(
      {
        $or: [
          { product: id },
          ...(sellPostIds.length ? [{ sellPost: { $in: sellPostIds } }] : []),
        ],
      },
      { $set: { product: null, sellPost: null } },
    ),
    Notification.updateMany({ productId: id }, { $unset: { productId: "" } }),
    Chat.updateMany(
      { contextType: "product", contextId: String(productId), isActive: true },
      {
        $set: {
          isActive: false,
          status: "closed",
          closedAt: now,
        },
      },
    ),
  ]);

  return results.reduce((summary, result, index) => {
    const key = [
      "sellPosts",
      "consumerCarts",
      "supersalerCarts",
      "wishlists",
      "reviews",
      "supersalerStock",
      "sourceProducts",
      "transactions",
      "notifications",
      "productChats",
    ][index];

    summary[key] =
      result.status === "fulfilled"
        ? result.value?.deletedCount ?? result.value?.modifiedCount ?? 0
        : 0;
    return summary;
  }, {});
};

export const deleteProductWithCascade = async (productOrId) => {
  const product =
    typeof productOrId === "object" && productOrId?._id
      ? productOrId
      : await Product.findById(productOrId);

  if (!product) return null;

  const cleanup = await cleanupProductReferences(product._id);
  await Product.deleteOne({ _id: product._id });

  return { product, cleanup };
};

export const deleteUserWithCascade = async (userId) => {
  const id = toObjectId(userId);
  const products = await Product.find({ producer: id });
  const productCleanups = [];

  for (const product of products) {
    const deleted = await deleteProductWithCascade(product);
    if (deleted) {
      productCleanups.push({
        productId: String(product._id),
        cleanup: deleted.cleanup,
      });
    }
  }

  const [
    cartCleanup,
    wishlistCleanup,
    supersalerCartCleanup,
    deviceCleanup,
    chatCleanup,
    notificationCleanup,
  ] =
    await Promise.all([
      Cart.deleteMany({ userId: id }),
      Wishlist.deleteMany({ userId: id }),
      SupersalerBuyProductCart.deleteMany({ supersaler: id }),
      DeviceSession.updateMany({ user: id, revokedAt: null }, { $set: { revokedAt: new Date() } }),
      Chat.updateMany(
        { participants: id, isActive: true },
        { $set: { isActive: false, status: "closed", closedAt: new Date() } },
      ),
      Notification.deleteMany({ recipient: id }),
    ]);

  const user = await User.findByIdAndDelete(id);

  return {
    user,
    cleanup: {
      products: productCleanups,
      carts: cartCleanup.deletedCount || 0,
      wishlists: wishlistCleanup.deletedCount || 0,
      supersalerCarts: supersalerCartCleanup.deletedCount || 0,
      devices: deviceCleanup.modifiedCount || 0,
      chats: chatCleanup.modifiedCount || 0,
      notifications: notificationCleanup.deletedCount || 0,
    },
  };
};
