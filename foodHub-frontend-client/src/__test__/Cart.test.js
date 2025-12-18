import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Cart from "../pages/cart";

// 1. IMPORT CÁC THƯ VIỆN
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router";
import axios from "axios";
// QUAN TRỌNG: Import instance đã được mock để điều khiển trong test case
import axiosInstance from "../util/axios"; 
import * as turf from "@turf/turf";

// ======================================================
// 2. KHU VỰC MOCK
// ======================================================

// Mock React Router
jest.mock("react-router", () => ({
  useHistory: jest.fn(),
}));

// Mock React Redux
jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

// Mock Axios thường
jest.mock("axios");

// --- SỬA LỖI Ở ĐÂY ---
// Định nghĩa object mock trực tiếp bên trong factory function
jest.mock("../util/axios", () => {
  const mockAxios = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  
  return {
    __esModule: true,
    default: mockAxios,
  };
});

// Mock Turf
jest.mock("@turf/turf", () => ({
  length: jest.fn(),
}));

// Mock Component con
jest.mock("../components/CartItem", () => () => <div data-testid="cart-item">Cart Item</div>);
jest.mock("../components/SearchBar", () => () => <div data-testid="search-bar">Search Bar</div>);
jest.mock("../util/spinner/spinner", () => () => <div data-testid="spinner">Loading...</div>);

// Mock Redux Actions
jest.mock("../redux/actions/dataActions", () => ({
  getCart: jest.fn(),
  fetchAddress: jest.fn(),
}));

// Mock Material UI Styles
jest.mock("@material-ui/core/styles/makeStyles", () => () => () => ({
  title: "title",
  spaceTypo: "spaceTypo",
  checkoutButton: "checkoutButton",
  address: "address",
}));

// ======================================================
// 3. TEST CASES
// ======================================================

describe("Cart Component", () => {
  let mockDispatch;
  let mockHistoryPush;

  const mockLocalStorage = () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key) => {
          if (key === "location") return "123 Test Street";
          if (key === "latlng") return "10.7,106.6";
          return null;
        }),
      },
      writable: true,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDispatch = jest.fn();
    useDispatch.mockReturnValue(mockDispatch);
    
    mockHistoryPush = jest.fn();
    useHistory.mockReturnValue({ push: mockHistoryPush });

    mockLocalStorage();
    turf.length.mockReturnValue(5);

    // --- SỬA CÁCH GỌI MOCK ---
    // Bây giờ ta gọi axiosInstance (biến import ở dòng đầu)
    // Vì nó đã được mock, nó chính là cái object mockAxios ta định nghĩa ở trên
    axiosInstance.get.mockResolvedValue({
      status: 200,
      data: {
        data: {
          address: { lat: 10.7, lng: 106.6 },
          data: 15000,
        },
      },
    });

    axios.get.mockResolvedValue({
      status: 200,
      data: {
        routes: [{ geometry: { coordinates: [] } }],
      },
    });
  });

  // TEST CASE 1
  test("1. Hiển thị Spinner khi đang Loading", () => {
    useSelector.mockImplementation((selector) =>
      selector({
        data: { loading: true, cart: [], price: 0 },
        UI: { errors: null },
        deliveryData: { deliveryCharge: 0 },
      })
    );

    render(<Cart location={{ state: {} }} />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  // TEST CASE 2
// TEST CASE 2
  test("2. Hiển thị Giỏ hàng (Step 1) với các món ăn", () => {
    useSelector.mockImplementation((selector) =>
      selector({
        data: {
          loading: false,
          cart: [
            {
              itemId: { _id: "1", title: "Pho", price: 50000, creator: "seller1" },
              quantity: 2,
            },
          ],
          price: 100000,
        },
        UI: { errors: null },
        deliveryData: { deliveryCharge: 0 },
      })
    );

    render(<Cart location={{ state: {} }} />);

    expect(screen.getByText(/Cart \(1 Items\)/i)).toBeInTheDocument();
    expect(screen.getByTestId("cart-item")).toBeInTheDocument();
    
    // --- SỬA Ở ĐÂY ---
    // Vì số 100000 xuất hiện 2 lần (Initial + Grand Total), ta dùng getAllByText
    const prices = screen.getAllByText(/100000/);
    expect(prices.length).toBeGreaterThan(0); // Chỉ cần đảm bảo nó có xuất hiện
    // -----------------
    
    const checkoutBtn = screen.getByRole("button", { name: /Proceed to Checkout/i });
    expect(checkoutBtn).toBeInTheDocument();
    expect(checkoutBtn).not.toBeDisabled();
  });

  // TEST CASE 3
  test("3. Button Checkout bị disable nếu tổng tiền là 0", () => {
    useSelector.mockImplementation((selector) =>
      selector({
        data: { loading: false, cart: [], price: 0 },
        UI: { errors: null },
        deliveryData: { deliveryCharge: 0 },
      })
    );

    render(<Cart location={{ state: {} }} />);
    const checkoutBtn = screen.getByRole("button", { name: /Proceed to Checkout/i });
    expect(checkoutBtn).toBeDisabled();
  });

  // TEST CASE 4
  test("4. Chuyển sang Step 2 (Delivery Details) khi bấm Checkout", () => {
    useSelector.mockImplementation((selector) =>
      selector({
        data: {
          loading: false,
          cart: [
            { itemId: { _id: "1", price: 50, creator: "seller1" }, quantity: 1 },
          ],
          price: 50,
        },
        UI: { errors: null },
        deliveryData: { deliveryCharge: 0 },
      })
    );

    render(<Cart location={{ state: {} }} />);

    fireEvent.click(screen.getByRole("button", { name: /Proceed to Checkout/i }));

    expect(screen.getByText("Delivery Details")).toBeInTheDocument();
    expect(screen.getByText("Address:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Place Order/i })).toBeInTheDocument();
  });

  // TEST CASE 5
  test("5. Nút Place Order gọi logic dispatch action khi dữ liệu hợp lệ", async () => {
    useSelector.mockImplementation((selector) =>
      selector({
        data: {
          loading: false,
          cart: [
            {
              itemId: { _id: "1", title: "Cơm", price: 50000, creator: "seller1" },
              quantity: 1,
            },
          ],
          price: 50000,
        },
        UI: { errors: null },
        deliveryData: { deliveryCharge: 15000 },
      })
    );

    render(
      <Cart
        location={{
          state: { address: { street: "123 Street", phoneNo: "0909090909" } },
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Proceed to Checkout/i }));

    const phoneInput = screen.getByLabelText(/Contact Number/i);
    expect(phoneInput.value).toBe("0909090909");

    fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});