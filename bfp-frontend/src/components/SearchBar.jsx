import React, { useContext, useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { MapContext } from "../logic.jsx";

export default function SearchBar() {
  const {
    searchText,
    setSearchText,
    onLoadAutocomplete,
    onPlaceChanged,
    
  } = useContext(MapContext);

  const inputRef = useRef(null);
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onPlaceChanged();
      try { inputRef.current && inputRef.current.blur(); } catch (err) {}
    }
  };

  // Avoid rendering <Autocomplete> when the Google Maps API (places) isn't available yet
  const placesLoaded = typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places;

  const inputBox = (
    <div className="search-bar-container">
      <input
        type="text"
        placeholder="Search address or place..."
        className="search-bar-input"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onKeyDown={onKeyDown}
        ref={inputRef}
      />
      {searchText && (
        <button
          type="button"
          className="clear-search-button"
          onClick={() => setSearchText("")}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );



  return (
    <form onSubmit={(e) => { e.preventDefault(); onPlaceChanged(); }}>
      {placesLoaded ? (
        <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged} options={{ componentRestrictions: { country: 'ph' } }}>
          {inputBox}
        </Autocomplete>
      ) : (
        // fallback to plain input until the Maps API loads
        inputBox
      )}
      
    </form>
  );
}