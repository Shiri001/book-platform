import BookList from './BookList';
import BookDetail from './BookDetail';
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() { // a react component return JSX describing its UI
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BookList />} />
        <Route path="/books/:id" element={<BookDetail />} />
      </Routes>
    </BrowserRouter>
    
  );
}

export default App;


