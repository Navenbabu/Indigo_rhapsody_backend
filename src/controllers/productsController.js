import React, { useEffect, useState } from "react";
import { getProductsBydesigner } from "../../service/productsService";
import { RecentOrderWrap } from "../recentOrders/RecentOrderTable.styles";
import styled from "styled-components";

const Dialog = styled.div`
  display: ${(props) => (props.show ? "block" : "none")};
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  max-width: 800px;
  width: 100%;
  overflow-y: auto;
  max-height: 90vh;
`;

const Overlay = styled.div`
  display: ${(props) => (props.show ? "block" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const FormSection = styled.div`
  margin-bottom: 20px;

  h4 {
    margin-bottom: 10px;
    font-size: 18px;
    color: #333;
  }

  label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
  }

  input,
  textarea {
    width: 100%;
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 6px;
    border: 1px solid #ccc;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);

    &:focus {
      outline: none;
      border-color: #007bff;
    }
  }

  textarea {
    resize: vertical;
  }

  .variant-container {
    margin-bottom: 20px;
  }

  .variant-row {
    display: flex;
    gap: 10px;
    align-items: center;

    input {
      flex: 1;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #ccc;
      margin-bottom: 5px;

      &:focus {
        border-color: #007bff;
      }
    }

    .add-size-button {
      background-color: #28a745;
      color: white;
      padding: 8px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;

  button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;

    &.cancel {
      background-color: #f0f0f0;
      color: #333;
    }

    &.continue {
      background-color: #007bff;
      color: #fff;
    }
  }
`;

function ProductsTable() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProductsBydesigner();
        setProducts(data.products);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleViewEdit = (product) => {
    setSelectedProduct(product);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setSelectedProduct(null);
    setShowDialog(false);
  };

  return (
    <RecentOrderWrap>
      <h2>Products</h2>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Cover Photo</th>
              <th>Photos</th>
              <th>Price</th>
              <th>Sub-Category</th>
              <th>Category</th>
              <th>Colors</th>
              <th>Sizes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={index}>
                <td>{product.productName}</td>
                <td>
                  <img
                    src={product.coverImage}
                    alt={product.productName}
                    style={{
                      width: "50px",
                      height: "50px",
                      objectFit: "cover",
                    }}
                  />
                </td>
                <td>
                  {product.variants.map((variant, vIndex) => (
                    <img
                      key={vIndex}
                      src={variant.imageList[0]}
                      alt={variant.color}
                      style={{
                        width: "30px",
                        height: "30px",
                        objectFit: "cover",
                        marginRight: "5px",
                      }}
                    />
                  ))}
                </td>
                <td>{product.price} $</td>
                <td>{product.subCategory.name}</td>
                <td>{product.category.name}</td>
                <td>
                  {product.variants.map((variant, vIndex) => (
                    <div
                      key={vIndex}
                      style={{
                        display: "inline-block",
                        width: "15px",
                        height: "15px",
                        backgroundColor: variant.color,
                        marginRight: "5px",
                        borderRadius: "50%",
                      }}
                    ></div>
                  ))}
                </td>
                <td>
                  <ul>
                    {product.variants.flatMap((variant) =>
                      variant.sizes.map((size, sIndex) => (
                        <li key={sIndex}>{size.size}</li>
                      ))
                    )}
                  </ul>
                </td>
                <td>
                  <button
                    style={{ marginRight: "5px" }}
                    onClick={() => handleViewEdit(product)}
                  >
                    View
                  </button>
                  <button onClick={() => handleViewEdit(product)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Dialog Component */}
      <Overlay show={showDialog} onClick={closeDialog} />
      <Dialog show={showDialog}>
        {selectedProduct && (
          <form>
            <FormSection>
              <h4>Product Information</h4>
              <label htmlFor="productName">Name</label>
              <input
                type="text"
                id="productName"
                defaultValue={selectedProduct.productName}
                readOnly
              />
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows="3"
                defaultValue={selectedProduct.description}
                readOnly
              />
              <label htmlFor="variants">Variants</label>
              {selectedProduct.variants.map((variant, index) => (
                <div className="variant-container" key={index}>
                  <label>Color</label>
                  <input
                    type="text"
                    value={variant.color}
                    readOnly
                    style={{ width: "100%", marginBottom: "10px" }}
                  />
                  <div className="variant-row">
                    <input type="text" value="Size" readOnly />
                    <input type="text" value="Price" readOnly />
                    <input type="text" value="Stock" readOnly />
                    <button className="add-size-button">+</button>
                  </div>
                  {variant.sizes.map((size, sIndex) => (
                    <div className="variant-row" key={sIndex}>
                      <input type="text" value={size.size} readOnly />
                      <input type="text" value={size.price} readOnly />
                      <input type="text" value={size.stock} readOnly />
                    </div>
                  ))}
                </div>
              ))}
            </FormSection>

            <ButtonGroup>
              <button type="button" className="cancel" onClick={closeDialog}>
                Close
              </button>
              <button type="button" className="continue" onClick={closeDialog}>
                Done
              </button>
            </ButtonGroup>
          </form>
        )}
      </Dialog>
    </RecentOrderWrap>
  );
}

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Ensure the product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update the product with the provided fields
    const updatedProduct = await Product.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    return res.status(200).json({ message: "Product updated successfully", updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error.message);
    return res.status(500).json({ message: "Failed to update product", error: error.message });
  }
};


export default ProductsTable;
