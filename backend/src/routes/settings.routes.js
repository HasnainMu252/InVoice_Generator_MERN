import { Router } from "express";

import { asyncHandler } from "../middleware/error.js";
import Settings from "../models/Settings.js";

const router = Router();

/** Always returns the singleton settings doc, creating it on first access. */
async function getOrCreate() {
  let doc = await Settings.findOne({ key: "default" });
  if (!doc) doc = await Settings.create({ key: "default" });
  return doc;
}

router.get(
  "/",
  asyncHandler(async (_req, res) => res.json(await getOrCreate())),
);

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const doc = await getOrCreate();
    const { key, id, _id, ...patch } = req.body ?? {};
    Object.assign(doc, patch);
    await doc.save();
    return res.json(doc);
  }),
);

export default router;
