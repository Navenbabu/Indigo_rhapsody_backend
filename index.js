const express = require("express");
const router = express.Router();
const categoryRoutes = require("./src/routes/categoryRoutes.js");
const productRoutes = require("./src/routes/productRoutes.js");
const connectDB = require("./src/config/database");
const subcategoryRoutes = require("./src/routes/subcategoryRoutes.js");
const cartRoutes = require("./src/routes/cartRoutes.js");
const orderRoutes = require("./src/routes/orderRoutes.js");
const paymentRoutes = require("./src/routes/paymentRoutes.js");
const userRoutes = require("./src/routes/userRoutes.js");
const shippingRoutes = require("./src/routes/shippingRoutes.js");
const designerRoutes = require("./src/routes/designerRoutes.js");
const bannerRoutes = require("./src/routes/bannerRoutes.js");
const filterRoutes = require("./src/routes/filterRoutes.js");
const contentVideoRoutes = require("./src/routes/contentVideoRoutes.js");
const videoRoutes = require("./src/routes/videoRoutes.js");
const app = express();

const cors = require("cors");

connectDB();

app.use(express.json());
app.use(cors());

app.use("/products", productRoutes);
app.use("/category", categoryRoutes);
app.use("/subcategory", subcategoryRoutes);
app.use("/cart", cartRoutes);
app.use("/order", orderRoutes);
app.use("/payment", paymentRoutes);
app.use("/user", userRoutes);
app.use("/shipping", shippingRoutes);
app.use("/designer", designerRoutes);
app.use("/banner", bannerRoutes);
app.use("/filter", filterRoutes);
app.use("/video", videoRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(
    `Bueno Noches!Hola amigo kaise ho theek ho  Server running on port ${PORT}`
  );
});
