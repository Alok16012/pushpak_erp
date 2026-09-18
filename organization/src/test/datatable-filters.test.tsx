import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { DataTable, type Column, type TableFilter } from "@/components/ui/DataTable";

/**
 * The table has always had a filter, but only one, and it picked the column
 * itself — "status" if there was one, else the first sortable column. A
 * register narrowed by state *and* district *and* status could not say so.
 */
interface Row {
  id: string;
  name: string;
  state: string;
  district: string;
  status: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Patna Branch", state: "Bihar", district: "Patna", status: "active" },
  { id: "2", name: "Gaya Branch", state: "Bihar", district: "Gaya", status: "inactive" },
  { id: "3", name: "Pune Branch", state: "Maharashtra", district: "Pune", status: "active" },
];

const columns: Column<Row>[] = [
  { key: "name", header: "Branch" },
  { key: "state", header: "State" },
  { key: "status", header: "Status" },
];

const filters: TableFilter<Row>[] = [
  { label: "State", key: "state" },
  { label: "District", key: "district" },
  { label: "Status", key: "status", options: ["active", "inactive"] },
];

const table = () => screen.getByRole("table");
const names = () =>
  within(table())
    .getAllByRole("row")
    .slice(1)
    .map((r) => r.textContent?.match(/\w+ Branch/)?.[0]);

const openFilters = () => fireEvent.click(screen.getByRole("button", { name: /filters/i }));
/** The filter buttons live in the bar, not in the rows. */
const chooseIn = (label: string, choice: string) => {
  // The label also appears as a column header; the filter's own is the <p>.
  const group = screen.getByText(label, { selector: "p" }).closest("div") as HTMLElement;
  fireEvent.click(within(group).getByRole("button", { name: choice }));
};

describe("DataTable named filters", () => {
  it("offers one group per filter, labelled", () => {
    render(<DataTable data={ROWS} columns={columns} filters={filters} />);
    openFilters();

    for (const label of ["State", "District", "Status"]) {
      expect(screen.getByText(label, { selector: "p" })).toBeInTheDocument();
    }
  });

  it("reads the choices off the rows, and takes fixed ones when given", () => {
    render(<DataTable data={ROWS} columns={columns} filters={filters} />);
    openFilters();

    const stateGroup = screen.getByText("State", { selector: "p" }).closest("div") as HTMLElement;
    expect(within(stateGroup).getByRole("button", { name: "Bihar" })).toBeInTheDocument();
    expect(within(stateGroup).getByRole("button", { name: "Maharashtra" })).toBeInTheDocument();
  });

  it("narrows the rows to the chosen value", () => {
    render(<DataTable data={ROWS} columns={columns} filters={filters} />);
    openFilters();
    chooseIn("State", "Bihar");

    expect(names()).toEqual(["Patna Branch", "Gaya Branch"]);
  });

  // The point of the change: one filter at a time was the old behaviour.
  it("applies every chosen filter together, not just the last one", () => {
    render(<DataTable data={ROWS} columns={columns} filters={filters} />);
    openFilters();
    chooseIn("State", "Bihar");
    chooseIn("Status", "active");

    expect(names()).toEqual(["Patna Branch"]);
  });

  it("counts the active filters on the button", () => {
    render(<DataTable data={ROWS} columns={columns} filters={filters} />);
    openFilters();
    chooseIn("State", "Bihar");
    chooseIn("Status", "active");

    expect(screen.getByRole("button", { name: /filters · 2/i })).toBeInTheDocument();
  });

  it("clears a filter when its chosen value is pressed again", () => {
    render(<DataTable data={ROWS} columns={columns} filters={filters} />);
    openFilters();
    chooseIn("State", "Bihar");
    expect(names()).toHaveLength(2);

    chooseIn("State", "Bihar");
    expect(names()).toHaveLength(3);
  });

  it("clears every filter at once", () => {
    render(<DataTable data={ROWS} columns={columns} filters={filters} />);
    openFilters();
    chooseIn("State", "Bihar");
    chooseIn("Status", "active");

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(names()).toHaveLength(3);
  });

  // Every table that was not given `filters` has to behave exactly as before.
  it("leaves a table without named filters on its old single filter", () => {
    render(<DataTable data={ROWS} columns={columns} />);
    openFilters();

    expect(screen.queryByText("District", { selector: "p" })).toBeNull();
    // The old filter picks the status column by name and lists its values.
    expect(screen.getByText("Status", { selector: "span" })).toBeInTheDocument();
  });
});
