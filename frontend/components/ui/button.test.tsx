import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders with children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Submit</Button>);
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: /disabled/i })).toBeDisabled();
  });

  it("renders as child when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/home">Link</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: /link/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/home");
  });
});
