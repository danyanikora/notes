import React, { useState, useEffect, createContext } from "react";
import Note, { NoteT } from "./components/Note";
import SideBar from "./components/SideBar";
import Draft from "./components/Draft";
import Overlay, { OverlayProps } from "./components/Overlay";

export type FiltersT = {
  sort: "ascending" | "descending";
  includes: string;
  tag: string;
};

type OverlaysContextProps = {
  overlaysProps: OverlayProps;
  showOverlays: boolean;
  mountOverlays: (
    handleClick: OverlayProps["handleClick"],
    overlayedElementRef: OverlayProps["overlayedElementRef"]
  ) => void;
  unmountOverlays: () => void;
};

export const OverlaysContext = createContext<OverlaysContextProps>({
  overlaysProps: { overlayedElementRef: undefined, handleClick: undefined },
  showOverlays: false,
  mountOverlays: () => undefined,
  unmountOverlays: () => undefined,
});

function App() {
  const [notes, setNotes] = useState<NoteT[]>(
    JSON.parse(localStorage.getItem("notes")) || []
  );
  const [tags, setTags] = useState<Set<string>>(
    new Set(JSON.parse(localStorage.getItem("tags")) || [])
  );
  const [filters, setFilters] = useState<FiltersT>({
    sort: "ascending",
    includes: "",
    tag: "",
  });
  const [showOverlays, setShowOverlays] = useState(false);
  const [overlaysProps, setOverlaysProps] = useState<OverlayProps>({
    overlayedElementRef: undefined,
    handleClick: undefined,
  });

  function applyFilters(notes: NoteT[]) {
    let filteredNotes = [...notes];

    if (filters.tag) {
      filteredNotes = filteredNotes.filter((note) =>
        note.tags.includes(filters.tag)
      );
    }

    if (filters.includes) {
      filteredNotes = filteredNotes.filter((note) => {
        const regExp = new RegExp(filters.includes, "iu");
        return note.text.match(regExp);
      });
    }

    filteredNotes.sort((a, b) => {
      if (filters.sort === "ascending") return a.last_update - b.last_update;
      return b.last_update - a.last_update;
    });

    return filteredNotes;
  }

  function getNoteById(id: NoteT["id"]) {
    const note = notes.find((note) => note.id === id);
    if (!note) {
      throw new Error(`Note with id '${id}' doesn't exist`);
    }
    return note;
  }

  function changeNoteDecorator(id: NoteT["id"], field: keyof NoteT) {
    const note = getNoteById(id);

    return function (newValue: NoteT[typeof field]) {
      setNotes((prevNotes) => [
        ...prevNotes.filter((note) => note.id !== id),
        { ...note, [field]: newValue, last_update: Date.now() },
      ]);
    };
  }

  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("tags", JSON.stringify([...tags]));
  }, [tags]);

  return (
    <OverlaysContext.Provider
      value={{
        overlaysProps,
        showOverlays,
        mountOverlays(handleClick, overlayedElementRef) {
          setOverlaysProps({ handleClick, overlayedElementRef });
          setShowOverlays(true);
        },
        unmountOverlays() {
          setShowOverlays(false);
        },
      }}
    >
      <div className="page-container">
        <SideBar
          tags={[...tags]}
          filters={filters}
          setTag={(tag) =>
            setFilters((prevFilters) => ({ ...prevFilters, tag }))
          }
          setIncludes={(string) =>
            setFilters((prevFilters) => ({
              ...prevFilters,
              includes: string,
            }))
          }
          setSort={(order) =>
            setFilters((prevFilters) => ({ ...prevFilters, sort: order }))
          }
          addTag={(tag) => setTags((prevTags) => new Set([...prevTags, tag]))}
          deleteTag={(tag) =>
            setTags((prevTags) => {
              const newTags = new Set([...prevTags].filter((t) => t !== tag));
              setNotes((prevNotes) =>
                prevNotes.map((note) => {
                  if (note.tags.includes(tag)) {
                    note.tags = note.tags.filter((t) => t !== tag);
                  }
                  return note;
                })
              );
              return newTags;
            })
          }
          renameTag={(tag, newName) =>
            setTags((prevTags) => {
              const newTags = new Set(
                [...prevTags].map((t) => (t === tag ? newName : t))
              );
              setNotes((prevNotes) =>
                prevNotes.map((note) => {
                  if (note.tags.includes(tag)) {
                    note.tags[note.tags.indexOf(tag)] = newName;
                  }
                  return note;
                })
              );
              return newTags;
            })
          }
        />
        <div className="notes">
          <Overlay />
          {applyFilters(notes).map((note) => (
            <Note
              key={note.id}
              data={note}
              setText={changeNoteDecorator(note.id, "text")}
              deleteNote={(id) => {
                // getNoteById will throw error if it won't find note with given id
                getNoteById(id);
                setNotes((prevNotes) => [
                  ...prevNotes.filter((note) => note.id !== id),
                ]);
              }}
              setTags={changeNoteDecorator(note.id, "tags")}
              allTags={[...tags]}
            />
          ))}
          {notes.length === 0 && "You don't have notes"}
        </div>
        <Draft
          addNote={(note) => setNotes((prevNotes) => [...prevNotes, note])}
          allTags={[...tags]}
        />
      </div>
    </OverlaysContext.Provider>
  );
}

export default App;