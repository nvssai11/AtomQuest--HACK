/* src/components/primitives/Table.jsx */
import React from 'react';

/**
 * Generic table component with optional sorting indicator.
 * Props:
 *   columns: [{ header: string, accessor: string, sortable?: boolean }]
 *   data: array of objects
 *   renderRow?: (row) => ReactNode – custom row rendering (optional)
 */
const Table = ({ columns, data, renderRow }) => {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.accessor}>
                {col.header}
                {col.sortable && <span aria-hidden="true" className="ml-1">⇅</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-text-secondary py-4">
                No data available.
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              renderRow ? (
                <React.Fragment key={idx}>{renderRow(row)}</React.Fragment>
              ) : (
                <tr key={idx}>
                  {columns.map(col => (
                    <td key={col.accessor}>{row[col.accessor]}</td>
                  ))}
                </tr>
              )
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
