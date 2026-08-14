import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function BookList() {

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
        {books.map(book => (
          <li key={book.id}>
            <Link to={`/books/${book.id}`}>
              {book.title}
            </Link>
            {" "}by {book.author}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BookList;