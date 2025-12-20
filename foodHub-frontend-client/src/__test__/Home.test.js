import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { useSelector } from "react-redux";
import Home from "../pages/home"; // Đảm bảo đường dẫn đúng

// --- 1. MOCK CÁC COMPONENT CON ---
// Chúng ta thay thế các component phức tạp bằng thẻ div đơn giản có data-testid
// để dễ tìm kiếm và kiểm tra xem nó có được render hay không.
jest.mock("../components/HomeStart", () => () => <div data-testid="home-start">HomeStart</div>);
jest.mock("../components/SearchBar", () => () => <div data-testid="search-bar">SearchBar</div>);
jest.mock("../util/spinner/spinner", () => () => <div data-testid="spinner">Spinner</div>);
jest.mock("../components/RestaurantContent", () => () => <div data-testid="restaurant-content">RestaurantContent</div>);

// --- 2. MOCK REACT ROUTER ---
// Mock component Redirect để kiểm tra xem nó có được gọi với đúng prop 'to' không
jest.mock("react-router-dom", () => ({
  Redirect: ({ to }) => <div data-testid="redirect">{to}</div>,
}));

// --- 3. MOCK REACT REDUX ---
jest.mock("react-redux", () => ({
  useSelector: jest.fn(),
}));

// --- 4. MOCK MATERIAL-UI STYLES ---
jest.mock("@material-ui/core/styles", () => ({
  makeStyles: () => () => ({
    center: "center",
    SearchBar: "SearchBar",
  }),
}));

describe("Home Component", () => {
  // Helper để mock LocalStorage
  const mockLocalStorage = (locationValue) => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(() => locationValue),
      },
      writable: true,
    });
  };

  beforeEach(() => {
    // Reset mock trước mỗi test
    useSelector.mockClear();
    mockLocalStorage(null); // Mặc định không có location
  });

  test("1. Nên Redirect sang dashboard nếu user là ROLE_SELLER", () => {
    // Giả lập state Redux: User đã đăng nhập và là Seller
    useSelector.mockImplementation((selector) =>
      selector({
        data: { loading: false },
        auth: {
          account: { role: "ROLE_SELLER" },
          authenticated: true,
        },
      })
    );

    render(<Home />);

    // Kiểm tra xem thẻ Redirect giả có xuất hiện với nội dung link đúng không
    const redirectEl = screen.getByTestId("redirect");
    expect(redirectEl).toBeInTheDocument();
    expect(redirectEl).toHaveTextContent("/seller/dashboard");
    
    // Đảm bảo các thành phần khác KHÔNG render
    expect(screen.queryByTestId("home-start")).not.toBeInTheDocument();
  });

  test("2. Nên hiển thị giao diện Home mặc định cho User thường (chưa chọn vị trí)", () => {
    // Giả lập state: User thường, chưa có location
    useSelector.mockImplementation((selector) =>
      selector({
        data: { loading: false },
        auth: {
          account: { role: "ROLE_USER" },
          authenticated: true, // hoặc false đều được với logic này
        },
      })
    );
    mockLocalStorage(null); // LocalStorage rỗng

    render(<Home />);

    // 1. Kiểm tra tiêu đề
    expect(screen.getByText(/Your favourite food, delivered with FoodHub/i)).toBeInTheDocument();
    
    // 2. Kiểm tra HomeStart và SearchBar có xuất hiện
    expect(screen.getByTestId("home-start")).toBeInTheDocument();
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();

    // 3. Kiểm tra thông báo yêu cầu nhập vị trí
    expect(screen.getByText("Enter your location to view nearby restaurants")).toBeInTheDocument();

    // 4. Đảm bảo KHÔNG hiện nội dung nhà hàng hay spinner
    expect(screen.queryByTestId("restaurant-content")).not.toBeInTheDocument();
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  test("3. Nên hiển thị Spinner khi đã có vị trí và đang Loading", () => {
    // Giả lập state: Đang loading
    useSelector.mockImplementation((selector) =>
      selector({
        data: { loading: true }, // Quan trọng: loading = true
        auth: {
          account: { role: "ROLE_USER" },
          authenticated: true,
        },
      })
    );
    mockLocalStorage("some-location"); // Giả lập đã lưu vị trí trong localStorage

    render(<Home />);

    // Kiểm tra Spinner xuất hiện
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    
    // Kiểm tra các thành phần khác
    expect(screen.queryByTestId("restaurant-content")).not.toBeInTheDocument();
    expect(screen.queryByText("Enter your location to view nearby restaurants")).not.toBeInTheDocument();
  });

  test("4. Nên hiển thị RestaurantContent khi đã có vị trí và load xong", () => {
    // Giả lập state: Load xong (loading = false)
    useSelector.mockImplementation((selector) =>
      selector({
        data: { loading: false }, // Quan trọng: loading = false
        auth: {
          account: { role: "ROLE_USER" },
          authenticated: true,
        },
      })
    );
    mockLocalStorage("some-location"); // Đã có vị trí

    render(<Home />);

    // Kiểm tra nội dung nhà hàng xuất hiện
    expect(screen.getByTestId("restaurant-content")).toBeInTheDocument();

    // Đảm bảo Spinner không hiện
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });
});