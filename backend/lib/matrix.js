class Matrix {
  constructor(rows, cols, data = []) {
    this.rows = rows;
    this.cols = cols;
    this.data = data.length > 0 ? data : Array(rows).fill().map(() => Array(cols).fill(0));
  }

  static fromArray(arr) {
    return new Matrix(arr.length, 1, arr.map(x => [x]));
  }

  toArray() {
    let arr = [];
    for (let i = 0; i < this.rows; i++) {
        for (let j = 0; j < this.cols; j++) {
            arr.push(this.data[i][j]);
        }
    }
    return arr;
  }

  randomize() {
    this.data = this.data.map(row => row.map(e => Math.random() * 2 - 1));
  }

  add(n) {
    if (n instanceof Matrix) {
      if (this.rows !== n.rows || this.cols !== n.cols) {
        console.error('Columns and Rows of A must match Columns and Rows of B.');
        return;
      }
      this.data = this.data.map((row, i) => row.map((e, j) => e + n.data[i][j]));
    } else {
      this.data = this.data.map(row => row.map(e => e + n));
    }
  }

  static subtract(a, b) {
    if (a.rows !== b.rows || a.cols !== b.cols) {
      // console.error('Columns and Rows of A must match Columns and Rows of B.');
      return new Matrix(a.rows, a.cols);
    }
    let result = new Matrix(a.rows, a.cols);
    result.data = result.data.map((row, i) => row.map((e, j) => a.data[i][j] - b.data[i][j]));
    return result;
  }

  static multiply(a, b) {
    // Matrix product
    if (a.cols !== b.rows) {
      console.error('Columns of A must match rows of B.');
      return undefined;
    }
    let result = new Matrix(a.rows, b.cols);
    result.data = result.data.map((row, i) => {
      return row.map((e, j) => {
        let sum = 0;
        for (let k = 0; k < a.cols; k++) {
          sum += a.data[i][k] * b.data[k][j];
        }
        return sum;
      });
    });
    return result;
  }

  multiply(n) {
    // Scalar product or Element-wise
    if (n instanceof Matrix) {
      this.data = this.data.map((row, i) => row.map((e, j) => e * n.data[i][j]));
    } else {
      this.data = this.data.map(row => row.map(e => e * n));
    }
  }

  map(func) {
    // Apply a function to every element of matrix
    this.data = this.data.map((row, i) => row.map((e, j) => func(e, i, j)));
  }

  static map(matrix, func) {
    let result = new Matrix(matrix.rows, matrix.cols);
    result.data = matrix.data.map((row, i) => row.map((e, j) => func(e, i, j)));
    return result;
  }

  static transpose(matrix) {
    let result = new Matrix(matrix.cols, matrix.rows);
    result.data = result.data.map((row, i) => row.map((e, j) => matrix.data[j][i]));
    return result;
  }
}

module.exports = Matrix;