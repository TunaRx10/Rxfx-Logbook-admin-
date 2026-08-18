import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/utils";

/*
 * shadcn/ui Table primitives, adapted to the RxFx dark theme.
 * The `<table>` carries the `table-tech` class so the existing `.table-tech th/td`
 * CSS in index.css keeps styling rows and cells; these components only provide
 * the standard shadcn API surface (Table, TableHeader, TableBody, TableRow,
 * TableHead, TableCell, TableCaption) so pages can compose tables declaratively.
 */

/*
 * SortableHeader — clickable <th> content for TanStack Table columns.
 * Reads the column's sort state directly and toggles on click.
 */
const SortableHeader = ({ column, label }) => {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="inline-flex items-center gap-1.5 uppercase tracking-[0.25em] text-[inherit] font-[inherit] hover:text-white/70 transition-colors"
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp size={12} className="text-cyan" />
      ) : sorted === "desc" ? (
        <ArrowDown size={12} className="text-cyan" />
      ) : (
        <ChevronsUpDown size={12} className="opacity-30" />
      )}
    </button>
  );
};

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="table-wrap">
    <table ref={ref} className={cn("table-tech w-full", className)} {...props} />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn(className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn(className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn(className)} {...props} />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn(className)} {...props} />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th ref={ref} className={cn(className)} {...props} />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn(className)} {...props} />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn(className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  SortableHeader,
};
