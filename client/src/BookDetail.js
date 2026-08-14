import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

function BookDetail(){
    const { id } = useParams();
    const [book, setBook] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:3000/api/books/${id}`)
        .then(res => res.json())
        .then(data => setBook(data));
    }, [id])

    if(!book){
        return <p>Loading....</p>
    }
    return(
        <div>
            <h1>{book.title}</h1>
            <p>By {book.author}</p>
            <p>{book.description}</p>
        </div>
    )
}

export default BookDetail;
