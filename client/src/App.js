import BookList from './BookList';
import BookDetail from './BookDetail';
import Shelf from './Shelf';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'

function App() { // a react component return JSX describing its UI
  return (
    <BrowserRouter>
      <nav style={{ padding: "10px", borderBottom: "1px solid #ccc", marginBottom: "20px" }}>
        <Link to="/">Books</Link> | <Link to="/shelf">My Shelf</Link>
      </nav>

      <Routes>
        <Route path="/" element={<BookList />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/shelf" element={<Shelf />} />
      </Routes>
    </BrowserRouter>

  );
}

export default App;


