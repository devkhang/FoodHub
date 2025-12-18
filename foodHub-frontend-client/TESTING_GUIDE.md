# Hướng Dẫn Viết Unit Tests cho Các Trang (Pages) - FoodHub

## 📋 Mục Lục
1. [Cấu Trúc Cơ Bản](#cấu-trúc-cơ-bản)
2. [Setup và Mocks](#setup-và-mocks)
3. [Các Loại Test Phổ Biến](#các-loại-test-phổ-biến)
4. [Ví Dụ Chi Tiết](#ví-dụ-chi-tiết)
5. [Best Practices](#best-practices)

---

## 🏗️ Cấu Trúc Cơ Bản

### Thư Mục Test
```
src/
├── __test__/
│   ├── Cart.test.js
│   ├── Orders.test.js
│   ├── Profile.test.js
│   ├── Restaurant.test.js
│   ├── Delivery.test.js
│   ├── Home.test.js
│   └── Login.test.js
├── pages/
│   ├── cart.js
│   ├── orders.js
│   ├── profile.js
│   ├── restaurant.js
│   ├── delivery.js
│   └── ...
└── redux/
    ├── actions/
    └── reducers/
```

### Template Cơ Bản
```javascript
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { BrowserRouter } from "react-router-dom";
import * as redux from "react-redux";
import YourPage from "../pages/yourpage";

// ======================== MOCKS ========================
// Chỗ mock dependencies

describe("YourPage Component", () => {
  // Setup
  let mockDispatch;
  let useSelectorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch = jest.fn();
    jest.spyOn(redux, "useDispatch").mockReturnValue(mockDispatch);
    useSelectorSpy = jest.spyOn(redux, "useSelector");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Tests
  test("test case 1", () => {
    // arrange, act, assert
  });
});
```

---

## 🎭 Setup và Mocks

### 1. Mock React Router
```javascript
const mockHistoryPush = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useHistory: () => ({
    push: mockHistoryPush,
    goBack: jest.fn(),
  }),
  useParams: () => ({
    restaurantId: "restaurant-123",
  }),
}));
```

### 2. Mock Redux
```javascript
let mockDispatch;
let useSelectorSpy;

beforeEach(() => {
  jest.clearAllMocks();
  mockDispatch = jest.fn();
  jest.spyOn(redux, "useDispatch").mockReturnValue(mockDispatch);
  useSelectorSpy = jest.spyOn(redux, "useSelector");
});

// Trong test
useSelectorSpy.mockImplementation((selector) => {
  return {
    data: { cartItems: [...] },
    loading: false,
  };
});
```

### 3. Mock Child Components
```javascript
jest.mock("../components/CartItem", () => () => (
  <div data-testid="cart-item">CartItem</div>
));

jest.mock("../components/SearchBar", () => () => (
  <div data-testid="search-bar">SearchBar</div>
));
```

### 4. Mock Material-UI Styles
```javascript
jest.mock("@material-ui/core/styles/makeStyles", () => () => () => ({
  title: "title",
  root: "root",
  container: "container",
}));
```

### 5. Mock Actions
```javascript
jest.mock("../redux/actions/dataActions", () => ({
  getCart: jest.fn(),
  fetchAddress: jest.fn(),
}));
```

### 6. Mock Socket.io
```javascript
jest.mock("socket.io-client", () => {
  return jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    off: jest.fn(),
  }));
});

jest.mock("../socket/socket", () => ({
  initSocket: jest.fn(),
  getSocket: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));
```

---

## 📝 Các Loại Test Phổ Biến

### 1. Test Render Component
```javascript
test("should render component with correct content", () => {
  // Arrange
  const mockData = { id: 1, name: "Test" };
  useSelectorSpy.mockImplementation(() => ({ data: mockData }));

  // Act
  render(<BrowserRouter><YourPage /></BrowserRouter>);

  // Assert
  expect(screen.getByTestId("component-id")).toBeInTheDocument();
});
```

### 2. Test Redux State
```javascript
test("should display data from Redux state", () => {
  const mockState = {
    items: [{ id: 1, name: "Item 1" }],
    loading: false,
  };

  useSelectorSpy.mockImplementation(() => mockState);
  render(<BrowserRouter><YourPage /></BrowserRouter>);

  // Verify data is displayed
  expect(screen.getByText("Item 1")).toBeInTheDocument();
});
```

### 3. Test Loading State
```javascript
test("should display spinner when loading", () => {
  useSelectorSpy.mockImplementation(() => ({
    data: [],
    loading: true,
  }));

  render(<BrowserRouter><YourPage /></BrowserRouter>);
  expect(screen.getByTestId("spinner")).toBeInTheDocument();
});
```

### 4. Test User Interactions
```javascript
test("should handle button click", () => {
  useSelectorSpy.mockImplementation(() => ({ data: { items: [] } }));
  
  render(<BrowserRouter><YourPage /></BrowserRouter>);
  
  const button = screen.getByRole("button", { name: /submit/i });
  fireEvent.click(button);
  
  expect(mockDispatch).toHaveBeenCalled();
});
```

### 5. Test Navigation
```javascript
test("should navigate when link is clicked", () => {
  const mockHistoryPush = jest.fn();
  
  render(<BrowserRouter><YourPage /></BrowserRouter>);
  
  const link = screen.getByRole("link", { name: /next/i });
  fireEvent.click(link);
  
  expect(mockHistoryPush).toHaveBeenCalledWith("/next-page");
});
```

### 6. Test Empty States
```javascript
test("should show empty message when no items", () => {
  useSelectorSpy.mockImplementation(() => ({
    items: [],
    loading: false,
  }));

  render(<BrowserRouter><YourPage /></BrowserRouter>);
  
  expect(screen.getByText(/no items found/i)).toBeInTheDocument();
});
```

### 7. Test Form Submission
```javascript
test("should submit form with data", async () => {
  const mockAction = jest.fn();
  useSelectorSpy.mockImplementation(() => ({ data: {} }));

  render(<BrowserRouter><YourPage /></BrowserRouter>);
  
  const input = screen.getByLabelText(/email/i);
  fireEvent.change(input, { target: { value: "test@example.com" } });
  
  const button = screen.getByRole("button", { name: /submit/i });
  fireEvent.click(button);
  
  await waitFor(() => {
    expect(mockAction).toHaveBeenCalled();
  });
});
```

### 8. Test Async Actions
```javascript
test("should fetch data on mount", async () => {
  useSelectorSpy.mockImplementation(() => ({
    data: [],
    loading: false,
  }));

  render(<BrowserRouter><YourPage /></BrowserRouter>);
  
  await waitFor(() => {
    expect(dataActions.getCart).toHaveBeenCalled();
  });
});
```

---

## 💡 Ví Dụ Chi Tiết

### Cart Page Test
Xem file: `src/__test__/Cart.test.js`

**Các test chính:**
- ✅ Render cart items từ Redux state
- ✅ Hiển thị spinner khi loading
- ✅ Fetch cart data khi mount
- ✅ Hiển thị message khi cart empty
- ✅ Xử lý checkout button
- ✅ Render SearchBar

### Orders Page Test
Xem file: `src/__test__/Orders.test.js`

**Các test chính:**
- ✅ Render danh sách orders
- ✅ Hiển thị spinner khi loading
- ✅ Fetch orders khi mount
- ✅ Hiển thị message khi không có orders
- ✅ Render pagination
- ✅ Khởi tạo socket connection
- ✅ Hiển thị snackbar notification
- ✅ Click order card navigation

### Profile Page Test
Xem file: `src/__test__/Profile.test.js`

**Các test chính:**
- ✅ Render portrait và delivery info cards
- ✅ Hiển thị user profile information
- ✅ Loading state
- ✅ Edit button
- ✅ Address fields
- ✅ Update profile handler
- ✅ Logout functionality
- ✅ Null user state

### Restaurant Page Test
Xem file: `src/__test__/Restaurant.test.js`

**Các test chính:**
- ✅ Render restaurant details
- ✅ Fetch data trên mount
- ✅ Display spinner
- ✅ Render search bar
- ✅ Filter items
- ✅ Back button navigation
- ✅ Empty items message

### Delivery Page Test
Xem file: `src/__test__/Delivery.test.js`

**Các test chính:**
- ✅ Render delivery info
- ✅ Display spinner
- ✅ Render map
- ✅ Display driver info
- ✅ Show estimated time
- ✅ Socket location updates
- ✅ Status badge
- ✅ Contact driver button
- ✅ Completed state

---

## 🎯 Best Practices

### 1. Đặt Tên Test Rõ Ràng
```javascript
// ❌ Không tốt
test("it works", () => {});

// ✅ Tốt
test("should display cart items when data is loaded", () => {});
```

### 2. Sử Dụng data-testid
```javascript
// ❌ Tránh query bằng class names
screen.getByClassName("cart-item");

// ✅ Dùng data-testid
jest.mock("../components/CartItem", () => () => (
  <div data-testid="cart-item">CartItem</div>
));
```

### 3. Follow Arrange-Act-Assert Pattern
```javascript
test("example", () => {
  // Arrange - Setup
  const mockData = { id: 1 };
  useSelectorSpy.mockImplementation(() => mockData);

  // Act - Render/Interact
  render(<BrowserRouter><YourPage /></BrowserRouter>);
  fireEvent.click(screen.getByRole("button"));

  // Assert - Verify
  expect(mockDispatch).toHaveBeenCalled();
});
```

### 4. Mock External Dependencies
```javascript
// ✅ Mock API calls, socket.io, localStorage, etc.
jest.mock("../util/axios");
jest.mock("socket.io-client");
jest.mock("../hooks/useForm");
```

### 5. Cleanup After Tests
```javascript
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
```

### 6. Test User Behavior, Not Implementation
```javascript
// ❌ Testing implementation details
expect(component.state.loading).toBe(false);

// ✅ Testing user behavior
expect(screen.getByText("Loading...")).not.toBeInTheDocument();
```

### 7. Sử Dụng waitFor cho Async
```javascript
test("async operation", async () => {
  render(<BrowserRouter><YourPage /></BrowserRouter>);
  
  await waitFor(() => {
    expect(screen.getByText("Loaded")).toBeInTheDocument();
  });
});
```

### 8. Mock Children Components để Tập Trung
```javascript
// ✅ Mock complex components để focus vào page logic
jest.mock("../components/ComplexComponent", () => () => (
  <div data-testid="complex">Mock</div>
));
```

---

## 🚀 Chạy Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test Cart.test.js

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

---

## 📚 Testing Library API

### Query Methods
```javascript
// Tìm element bằng text
screen.getByText("text");
screen.queryByText("text"); // returns null if not found
screen.findByText("text");  // async

// Tìm element bằng role
screen.getByRole("button", { name: /submit/i });
screen.getByRole("link", { name: /home/i });

// Tìm element bằng testid
screen.getByTestId("cart-item");

// Tìm element bằng label
screen.getByLabelText("Email");

// Tìm multiple elements
screen.getAllByTestId("item");
```

### User Events
```javascript
// Click
fireEvent.click(element);

// Change input
fireEvent.change(inputElement, { target: { value: "new value" } });

// Submit form
fireEvent.submit(formElement);

// Keyboard
fireEvent.keyDown(element, { key: "Enter" });
```

### Assertions
```javascript
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveTextContent("text");
expect(element).toHaveAttribute("href", "/path");
expect(element).toBeDisabled();
expect(element).toHaveClass("active");
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
```

---

## 🔗 Useful Links
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 📞 Liên Hệ & Hỗ Trợ
Nếu có câu hỏi về testing, hãy refer đến các test file đã tạo hoặc tài liệu chính thức của Testing Library.

