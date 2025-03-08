import express from "express";
import {
  changeProducerPassword,
  getProducerProfile,
  updateProducerProfile,
} from "../../controllers/producer/producerController.js";
import { verifyToken } from "./../../middleware/verifyToken.js";
import { verifyProducer } from "../../middleware/producer/verifyProducer.js";

const router = express.Router();

// Get Producer Profile
router.get("/profile", verifyToken, verifyProducer, getProducerProfile);

// Update Producer Profile
router.put("/profile", verifyToken, verifyProducer, updateProducerProfile);

// Change Producer Password
router.put(
  "/change-password",
  verifyToken,
  verifyProducer,
  changeProducerPassword
);

export default router;
