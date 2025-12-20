import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { BrowserRouter } from "react-router-dom";
import * as redux from "react-redux";
import Login from "../pages/login";
import * as authActions from "../redux/actions/authActions";

// 1. MOCK CÁC MODULE BÊN NGOÀI
// Mock react-router để xử lý useHistory
const mockHistoryPush = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

// Mock action loginAction
jest.mock("../redux/actions/authActions", () => ({
  loginAction: jest.fn(),
}));

// Mock style (makeStyles) nếu gặp lỗi về theme, nhưng thường JSDOM xử lý được.
// Nếu lỗi "theme.spreadThis is undefined", bạn cần wrap component trong ThemeProvider khi render
// hoặc mock makeStyles. Ở đây ta giả định theme đã ổn hoặc mock đơn giản:
jest.mock("@material-ui/core/styles/makeStyles", () => () => () => ({
  form: "form",
  title: "title",
  hamBurger: "hamBurger",
  textField: "textField",
  button: "button",
  customError: "customError",
  customSuccess: "customSuccess",
  progress: "progress",
}));

describe("Login Component", () => {
  let useDispatchSpy;
  let useSelectorSpy;
  let mockDispatch;

  beforeEach(() => {
    // Reset các mock trước mỗi test case
    jest.clearAllMocks();
    
    // Setup Mock cho Redux
    mockDispatch = jest.fn();
    useDispatchSpy = jest.spyOn(redux, "useDispatch").mockReturnValue(mockDispatch);
    useSelectorSpy = jest.spyOn(redux, "useSelector");
  });

  // Helper để render component có bọc Router (vì có thẻ <Link>)
  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  test("1. Nên render form login đúng cách (mặc định)", () => {
    // Giả lập state ban đầu
    useSelectorSpy.mockReturnValue({
      loading: false,
      errors: null,
      serverError: false,
      signUpSuccess: false,
    });

    renderComponent();

    // Kiểm tra các element có trên màn hình
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  test("2. Nên cho phép nhập Email và Password", () => {
    useSelectorSpy.mockReturnValue({ loading: false, errors: null });
    renderComponent();

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");

    // Giả lập hành động nhập liệu
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("password123");
  });

  test("3. Nên dispatch action loginAction khi submit form", () => {
    useSelectorSpy.mockReturnValue({ loading: false, errors: null });
    renderComponent();

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitBtn = screen.getByRole("button", { name: "Login" });

    // Nhập liệu
    fireEvent.change(emailInput, { target: { value: "user@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "123456" } });

    // Click submit
    fireEvent.submit(submitBtn.closest("form")); 
    // Hoặc: fireEvent.click(submitBtn);

    // Kiểm tra xem loginAction có được gọi với đúng tham số không
    expect(authActions.loginAction).toHaveBeenCalledWith(
      {
        email: "user@test.com",
        password: "123456",
      },
      expect.anything() // history object
    );
    
    // Kiểm tra dispatch có được gọi không
    expect(mockDispatch).toHaveBeenCalled();
  });

  test("4. Nên hiển thị Loading spinner và disable button khi đang loading", () => {
    // Giả lập state đang loading
    useSelectorSpy.mockReturnValue({
      loading: true,
      errors: null,
    });

    renderComponent();

    const submitBtn = screen.getByRole("button", { name: "Login" });
    
    // Button phải bị disable
    expect(submitBtn).toBeDisabled();
    // Phải hiển thị CircularProgress (MUI thường render role="progressbar")
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("5. Nên hiển thị lỗi 'Invalid email/password'", () => {
    useSelectorSpy.mockReturnValue({
      loading: false,
      errors: "Invalid email/password combination", // Chuỗi này phải chứa "Invalid email/password"
    });

    renderComponent();

    // Kiểm tra text lỗi xuất hiện
    expect(screen.getByText("Invalid email/password combination")).toBeInTheDocument();
  });

  test("6. Nên hiển thị lỗi 'Verify your email'", () => {
    useSelectorSpy.mockReturnValue({
      loading: false,
      errors: "Please Verify your email", 
    });

    renderComponent();

    expect(screen.getByText("Please Verify your email")).toBeInTheDocument();
  });

  test("7. Nên hiển thị thông báo thành công khi signUpSuccess = true", () => {
    useSelectorSpy.mockReturnValue({
      loading: false,
      signUpSuccess: true,
    });

    renderComponent();

    expect(
      screen.getByText(/Account registered successfully/i)
    ).toBeInTheDocument();
  });

  test("8. Nên hiển thị lỗi Server Error", () => {
     useSelectorSpy.mockReturnValue({
      loading: false,
      serverError: true,
    });

    renderComponent();

    expect(screen.getByText("server error, please try again")).toBeInTheDocument();
  });
});