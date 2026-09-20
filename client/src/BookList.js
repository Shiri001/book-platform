import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function BookList() {

  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("http://localhost:3000/api/books")  // React -> Fetch() -> Express -> JSON -> React
      .then(res => res.json())
      .then(data => { 
        setBooks(data.books);
        setTotal(data.total);
      });
  }, []);

  return (
    <div>
      <h1>Book Platform</h1>

      <p>{total} books in catalog</p>
      <p>{books.length} books displayed on this page</p>

      <ul>
        {books.map(book => (
          <li key={book.id}>
            {book.coverImageUrl && (
              <img
                src = {book.coverImageUrl}
                alt = {book.title}
                width = "100"
              />
            )}

            <br/>
            <Link to = {`/books/${book.id}`}>
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