import { Router, type IRouter } from "express";
import healthRouter from "./health";
import guestsRouter from "./guests";
import adminRouter from "./admin";
import eventConfigRouter from "./event-config";
import uploadRouter from "./upload";
import photosRouter from "./photos";
import whatsappRouter from "./whatsapp";
import themesRouter from "./themes";
import diagnosticsRouter from "./diagnostics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(guestsRouter);
router.use(adminRouter);
router.use(eventConfigRouter);
router.use(uploadRouter);
router.use(photosRouter);
router.use(whatsappRouter);
router.use(themesRouter);
router.use(diagnosticsRouter);

export default router;
