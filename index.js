const express = require("express");
const router = express.Router();
const categoryRoutes = require("./src/routes/categoryRoutes.js");
const productRoutes = require("./src/routes/productRoutes.js");
const connectDB = require("./src/config/database");
const subcategoryRoutes = require("./src/routes/subcategoryRoutes.js");

const app = express();

connectDB();

app.use(express.json());

app.use("/products", productRoutes);
app.use("/category", categoryRoutes);
app.use("/subcategory", subcategoryRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Bueno Noches! Server running on port ${PORT}`);
});
