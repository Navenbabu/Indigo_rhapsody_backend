const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const Product = require("../models/productModels");

// Create or Update Cart
exports.createCart = async (req, res) => {
  try {
    const { userId, products } = req.body;

    let cart = await Cart.findOne({ userId });

    if (cart) {
      cart.products = [];
    } else {
      cart = new Cart({
        userId,
        products: [],
      });
    }

    let subtotal = 0;

    // Loop through each product, get its price from the product model
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

      // Calculate price and add to cart
      cart.products.push({
        productId: item.productId,
        designerRef: product.designerRef,
        price: sizeVariant.price, // Get price from size variant
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        is_customizable: item.is_customizable || false,
        customizations: item.customizations || "",
      });

      subtotal += sizeVariant.price * item.quantity;

      // Update stock in the product model
      sizeVariant.stock -= item.quantity;
      await product.save();
    }

    // Set subtotal and calculate total amount
    cart.subtotal = subtotal;
    cart.total_amount = subtotal + cart.tax_amount + cart.shipping_cost;

    await cart.save();
    return res
      .status(201)
      .json({ message: "Cart created/updated successfully", cart });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error creating/updating cart", error: error.message });
  }
};

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

    // Check stock
    if (sizeVariant.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    // Find the user's cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        products: [],
      });
    }

    // Check if product already exists in the cart
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
        price: sizeVariant.price, // Use the actual price from the product model
        quantity,
        size,
        color,
        is_customizable,
        customizations,
      });
    }

    // Update stock
    sizeVariant.stock -= quantity;
    await product.save();

    // Recalculate subtotal and total amount
    let subtotal = 0;
    cart.products.forEach((product) => {
      subtotal += product.price * product.quantity;
    });

    cart.subtotal = subtotal;
    cart.total_amount = subtotal + cart.tax_amount + cart.shipping_cost;

    await cart.save();
    return res.status(201).json({ message: "Item added to cart", cart });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error adding item to cart", error });
  }
};

// Update Item Quantity
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

    // Check if we are increasing or decreasing the quantity
    const quantityChange = quantity - productInCart.quantity;

    // Check stock
    if (quantityChange > 0 && sizeVariant.stock < quantityChange) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    // Update the product quantity in the cart
    productInCart.quantity = quantity;

    // Update stock in the product model
    sizeVariant.stock -= quantityChange;

    await product.save();

    // Recalculate subtotal and total amount
    let subtotal = 0;
    cart.products.forEach((product) => {
      subtotal += product.price * product.quantity;
    });

    cart.subtotal = subtotal;
    cart.total_amount = subtotal + cart.tax_amount + cart.shipping_cost;

    await cart.save();

    return res.status(200).json({ message: "Quantity updated", cart });
  } catch (error) {
    return res.status(500).json({ message: "Error updating quantity", error });
  }
};

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

    // Recalculate subtotal and total amount
    let subtotal = 0;
    cart.products.forEach((product) => {
      subtotal += product.price * product.quantity;
    });

    cart.subtotal = subtotal;
    cart.total_amount = subtotal + cart.tax_amount + cart.shipping_cost;

    await cart.save();
    return res.status(200).json({ message: "Item deleted from cart", cart });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error deleting item from cart", error });
  }
};

exports.getCartForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the cart and populate necessary fields from the product and variant fields
    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      select: "productName price variants is_customizable",
      populate: {
        path: "variants",
        select: "color sizes",
      },
    });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Map through cart products to append size, price, and color info
    const populatedCart = cart.products.map((item) => {
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
        };
      }

      return item;
    });

    return res
      .status(200)
      .json({ cart: { ...cart.toObject(), products: populatedCart } });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching cart", error });
  }
};
