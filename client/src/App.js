import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from 'react'

function App() {

  const [books, setBooks] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/books")
    .then(res => res.json())
    .then(data => setBooks(data));
  }, []);

  return (
    <div>
      <h1>Book Platform</h1>
      <p>{books.length} books loaded</p>
      <ul>
        {books.map(book =>(
          <li key = {book.id}>
            {book.title} by {book.author}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
