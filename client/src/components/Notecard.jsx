export default function Notecard({ note, onDelete, onClick }) {
  // console.log("note")
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // return new Data(date).toLocaleDateString('en-US')
  return (
    <div 
      className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {note.title || 'Untitled'}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(note._id)
          }}
          className="text-red-500 hover:text-red-700"
        >
          🗑️
        </button>
      </div>
      <p className="text-sm text-gray-500">
        Last updated: {formatDate(note.updatedAt)}
      </p>
      <div className="mt-2 flex items-center space-x-2">
        {note.isPublic && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            Public
          </span>
        )}
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {note.collaborators?.length || 1} collaborator(s)
        </span>
      </div>
    </div>
  )
}