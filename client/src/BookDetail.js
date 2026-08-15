import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

function BookDetail(){
    const { id } = useParams();
    const [book, setBook] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:3000/api/books/${id}`)
        .then(res => {
            if(!res.ok){
                throw new Error("Not Found")
            }
            return res.json();
        })
        .then(data => setBook(data))
        .catch(() => setBook("not-found"));
    }, [id])

    if(book === "not-found"){
        return <p>Book Not Found</p>
    }

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
