const express = require("express");
const router = express.Router();
const categoryRoutes = require("./src/routes/categoryRoutes.js");
const productRoutes = require("./src/routes/productRoutes.js");
const connectDB = require("./src/config/database");
const subcategoryRoutes = require("./src/routes/subcategoryRoutes.js");
const cartRoutes = require("./src/routes/cartRoutes.js");
const orderRoutes = require("./src/routes/orderRoutes.js");
const app = express();

connectDB();

app.use(express.json());

app.use("/products", productRoutes);
app.use("/category", categoryRoutes);
app.use("/subcategory", subcategoryRoutes);
app.use("/cart", cartRoutes);
app.use("/order", orderRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Bueno Noches! Server running on port ${PORT}`);
});
