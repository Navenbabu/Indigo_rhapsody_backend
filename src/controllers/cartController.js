const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const Product = require("../models/productModels");

// Create or Update Cart
// Create or Update Cart

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}
exports.createCart = async (req, res) => {
  try {
    const { userId, products } = req.body;

    let cart = await Cart.findOne({ userId });

    if (cart) {
      // Reset the products array if cart already exists
      cart.products = [];
    } else {
      cart = new Cart({
        userId,
        products: [],
      });
    }

    let subtotal = 0;

    // Loop through each product and calculate price
    for (let item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found for ${item.productId}` });
      }

      const variant = product.variants.find((v) => v.color === item.color);
      if (!variant) {
        return res.status(404).json({
          message: `Color variant not found for product ${product.productName}`,
        });
      }

      const sizeVariant = variant.sizes.find((s) => s.size === item.size);
      if (!sizeVariant) {
        return res.status(404).json({
          message: `Size ${item.size} not found for product ${product.productName}`,
        });
      }

      // Check stock availability
      if (sizeVariant.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product ${product.productName}`,
        });
      }

      // Add product to cart
      cart.products.push({
        productId: item.productId,
        designerRef: product.designerRef,
        price: sizeVariant.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        is_customizable: item.is_customizable || false,
        customizations: item.customizations || "",
      });

      subtotal += sizeVariant.price * item.quantity;

      // Update product stock
      sizeVariant.stock -= item.quantity;
      await product.save();
    }

    // Calculate Tax Amount (GST at 12%)
    const tax_amount = subtotal * 0.12;

    // Calculate Shipping Cost based on subtotal
    const shipping_cost = subtotal > 3000 ? 0 : 99;

    // Calculate Total Amount
    cart.subtotal = subtotal;
    cart.tax_amount = tax_amount;
    cart.shipping_cost = shipping_cost;
    cart.total_amount = subtotal + tax_amount + shipping_cost;

    await cart.save();
    return res
      .status(201)
      .json({ message: "Cart created/updated successfully", cart });
  } catch (error) {
    console.error("Error creating/updating cart:", error);
    return res
      .status(500)
      .json({ message: "Error creating/updating cart", error: error.message });
  }
};

// Add Item to Cart
// Add Item to Cart
// Add Item to Cart
exports.addItemToCart = async (req, res) => {
  try {
    const {
      userId,
      productId,
      quantity,
      size,
      color,
      is_customizable,
      customizations,
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find((v) => v.color === color);
    if (!variant)
      return res.status(404).json({ message: "Color variant not found" });

    const sizeVariant = variant.sizes.find((s) => s.size === size);
    if (!sizeVariant)
      return res.status(404).json({ message: "Size not found" });

    if (sizeVariant.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    const productInCart = cart.products.find(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );

    if (productInCart) {
      productInCart.quantity += quantity;
    } else {
      cart.products.push({
        productId,
        designerRef: product.designerRef,
        price: sizeVariant.price,
        quantity,
        size,
        color,
        is_customizable: is_customizable || false,
        customizations: customizations || "",
      });
    }

    sizeVariant.stock -= quantity;
    await product.save();

    // Recalculate totals
    let subtotal = 0;
    cart.products.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    const tax_amount = subtotal * 0.12;
    const shipping_cost = subtotal > 3000 ? 0 : 99;

    cart.subtotal = subtotal;
    cart.tax_amount = tax_amount;
    cart.shipping_cost = shipping_cost;
    cart.total_amount = subtotal + tax_amount + shipping_cost;

    await cart.save();
    return res.status(201).json({ message: "Item added to cart", cart });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return res
      .status(500)
      .json({ message: "Error adding item to cart", error: error.message });
  }
};
exports.updateQuantity = async (req, res) => {
  try {
    const { userId, productId, size, color, quantity } = req.body;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find((v) => v.color === color);
    if (!variant)
      return res.status(404).json({ message: "Color variant not found" });

    const sizeVariant = variant.sizes.find((s) => s.size === size);
    if (!sizeVariant)
      return res.status(404).json({ message: "Size not found" });

    const productInCart = cart.products.find(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );

    if (!productInCart)
      return res.status(404).json({ message: "Product not found in cart" });

    // If quantity is less than 1, remove the item from the cart
    if (quantity < 1) {
      cart.products = cart.products.filter(
        (item) =>
          !(
            item.productId.toString() === productId.toString() &&
            item.size === size &&
            item.color === color
          )
      );
    } else {
      const quantityChange = quantity - productInCart.quantity;
      if (quantityChange > 0 && sizeVariant.stock < quantityChange) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      // Update the quantity in the cart and adjust stock
      productInCart.quantity = quantity;
      sizeVariant.stock -= quantityChange;
    }

    await product.save();

    // Recalculate totals
    let subtotal = 0;
    cart.products.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    const tax_amount = subtotal * 0.12;
    const shipping_cost = subtotal > 3000 ? 0 : 99;

    cart.subtotal = subtotal;
    cart.tax_amount = tax_amount;
    cart.shipping_cost = shipping_cost;
    cart.total_amount = subtotal + tax_amount + shipping_cost;

    await cart.save();
    return res.status(200).json({ message: "Quantity updated", cart });
  } catch (error) {
    console.error("Error updating quantity:", error);
    return res
      .status(500)
      .json({ message: "Error updating quantity", error: error.message });
  }
};

// Delete Item from Cart and Update Stock
// Delete Item from Cart and Update Stock
exports.deleteItem = async (req, res) => {
  try {
    const { userId, productId, size, color } = req.body;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find((v) => v.color === color);
    if (!variant) return res.status(404).json({ message: "Color not found" });

    const sizeVariant = variant.sizes.find((s) => s.size === size);
    if (!sizeVariant)
      return res.status(404).json({ message: "Size not found" });

    const productInCart = cart.products.find(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );

    if (!productInCart)
      return res.status(404).json({ message: "Product not found in cart" });

    // Update stock in the product model
    sizeVariant.stock += productInCart.quantity;
    await product.save();

    // Remove the product from the cart
    cart.products = cart.products.filter(
      (item) =>
        !(
          item.productId.toString() === productId.toString() &&
          item.size === size &&
          item.color === color
        )
    );

    // Recalculate totals
    let subtotal = 0;
    cart.products.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    const tax_amount = subtotal * 0.12;
    const shipping_cost = subtotal > 3000 ? 0 : 99;

    cart.subtotal = subtotal;
    cart.tax_amount = tax_amount;
    cart.shipping_cost = shipping_cost;
    cart.total_amount = subtotal + tax_amount + shipping_cost;

    await cart.save();
    return res.status(200).json({ message: "Item deleted from cart", cart });
  } catch (error) {
    console.error("Error deleting item from cart:", error);
    return res
      .status(500)
      .json({ message: "Error deleting item from cart", error: error.message });
  }
};

exports.getCartForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the cart and populate necessary fields from the product and variant fields
    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      select: "productName price variants is_customizable coverImage",
      populate: {
        path: "variants",
        select: "color sizes",
      },
    });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Map through cart products to append size, price, and color info
    const populatedProducts = cart.products.map((item) => {
      const product = item.productId;
      const variant = product.variants.find((v) => v.color === item.color);

      if (variant) {
        const sizeInfo = variant.sizes.find((s) => s.size === item.size);

        return {
          ...item.toObject(),
          productName: product.productName,
          price: sizeInfo ? sizeInfo.price : product.price,
          color: variant.color,
          size: item.size,
          is_customizable: product.is_customizable,
          image: product.coverImage,
        };
      }

      return item;
    });

    const responseCart = {
      ...cart.toObject(),
      products: populatedProducts,
      tax_amount: cart.tax_amount,
      shipping_cost: cart.shipping_cost,
      total_amount: cart.total_amount,
    };

    return res.status(200).json({ cart: responseCart });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({ message: "Error fetching cart", error });
  }
};

exports.upsertCart = async (req, res) => {
  try {
    const {
      userId,
      productId,
      quantity,
      size,
      color,
      is_customizable,
      customizations,
    } = req.body;

    let cart = await Cart.findOne({ userId });

    // If the cart doesn't exist, create a new one
    if (!cart) {
      cart = new Cart({
        userId,
        products: [],
        subtotal: 0,
        tax_amount: 0,
        shipping_cost: 0,
        total_amount: 0,
      });
    }

    // Fetch the product details
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find((v) => v.color === color);
    if (!variant)
      return res.status(404).json({ message: "Color variant not found" });

    const sizeVariant = variant.sizes.find((s) => s.size === size);
    if (!sizeVariant)
      return res.status(404).json({ message: "Size not found" });

    if (sizeVariant.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    // Check if the product already exists in the cart
    const productInCart = cart.products.find(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );

    if (productInCart) {
      // Update quantity if product already exists in the cart
      productInCart.quantity += quantity;
    } else {
      // Add new product to cart
      cart.products.push({
        productId,
        designerRef: product.designerRef,
        price: sizeVariant.price,
        quantity,
        size,
        color,
        is_customizable: is_customizable || false,
        customizations: customizations || "",
      });
    }

    // Reduce stock based on the quantity added
    sizeVariant.stock -= quantity;
    await product.save();

    // Recalculate the subtotal
    let subtotal = 0;
    cart.products.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    // Calculate tax and shipping
    const tax_amount = subtotal * 0.12;
    const shipping_cost = subtotal > 3000 ? 0 : 99;

    // Update the cart totals
    cart.subtotal = roundToTwoDecimals(subtotal);
    cart.tax_amount = tax_amount;
    cart.shipping_cost = shipping_cost;
    cart.total_amount = roundToTwoDecimals(
      subtotal + tax_amount + shipping_cost
    );

    await cart.save();

    return res.status(201).json({ message: "Cart updated successfully", cart });
  } catch (error) {
    console.error("Error updating cart:", error);
    return res
      .status(500)
      .json({ message: "Error updating cart", error: error.message });
  }
};
