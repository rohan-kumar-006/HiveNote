import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import * as Y from 'yjs'
import { notesAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { SocketIOProvider } from '../services/socketIOProvider'
import { 
  Share2, 
  Sparkles, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Minus,
  Underline as UnderlineIcon,
  Palette,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon
} from "lucide-react"
import ShareModal from '../components/ShareModal'
import SummaryModal from '../components/SummaryModal'
import '../styles/editor.css'

// Predefined colors for easy selection
const TEXT_COLORS = [
  '#000000', '#374151', '#DC2626', '#EA580C', '#CA8A04', 
  '#16A34A', '#2563EB', '#7C3AED', '#DB2777'
]

const HIGHLIGHT_COLORS = [
  '#FEF08A', '#FDE68A', '#FECACA', '#BBF7D0', '#BAE6FD', 
  '#DDD6FE', '#FBCFE8', '#E5E7EB'
]

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  // State
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [provider, setProvider] = useState(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  
  // New state for color pickers
  const [showTextColorPicker, setShowTextColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)

  // Create Yjs document using useMemo
  const ydocRef = useRef(null)
  if (!ydocRef.current) {
    console.log('Creating Yjs document')
    ydocRef.current = new Y.Doc()
  }
  const ydoc = ydocRef.current

  const user = authUser || { name: "Anonymous", email: "anonymous@example.com" }
  const userColor = useMemo(() => '#' + Math.floor(Math.random() * 16777215).toString(16), [])

  // Load note on mount
  useEffect(() => {
    if (id) {
      loadNote()
    }
  }, [id])

  const loadNote = async () => {
    try {
      setLoading(true)
      const response = await notesAPI.getOne(id)
      setNote(response.data)
    } catch (error) {
      console.error('Failed to load note:', error)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Create provider after note is loaded
  useEffect(() => {
    if (!note || !ydoc) return

    try {
      const newProvider = new SocketIOProvider(note.docId || id, ydoc)
      setProvider(newProvider)
    } catch (error) {
      console.error('Failed to setup provider:', error)
    }

    return () => {
      setProvider((prev) => {
        if (prev) {
          prev.destroy()
        }
        return null
      })
    }
  }, [note?.docId, ydoc, id])

  // Build extensions dynamically based on provider availability
  const extensions = useMemo(() => {
    const exts = [
      StarterKit.configure({
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      // New extensions
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Subscript,
      Superscript,
    ]

    // Only add CollaborationCursor when provider is available
    if (provider) {
      exts.push(
        CollaborationCursor.configure({
          provider: provider,
          user: {
            name: user?.name || 'Anonymous',
            color: userColor,
          },
        })
      )
    }

    return exts
  }, [ydoc, provider, user?.name, userColor])

  // Initialize editor
  const editor = useEditor({
    extensions,
    editorProps: {
      attributes: {
        class: 'prose prose-lg prose-headings:font-bold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl max-w-none focus:outline-none min-h-[500px] p-4',
      },
    },
    onCreate: ({ editor }) => {
      console.log('Editor created successfully')
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to, ' ')
      setSelectedText(text)
    },
  }, [extensions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ydocRef.current) {
        console.log('🧹 Destroying ydoc on unmount')
        ydocRef.current.destroy()
        ydocRef.current = null
      }
    }
  }, [])

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowTextColorPicker(false)
      setShowHighlightPicker(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const saveTitle = async (newTitle) => {
    if (!newTitle.trim()) return

    setSaving(true)
    try {
      await notesAPI.update(id, { title: newTitle })
      console.log('Title saved:', newTitle)
    } catch (error) {
      console.error('Failed to save title:', error)
      alert('Failed to save title')
    } finally {
      setSaving(false)
    }
  }

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setNote(prev => ({ ...prev, title: newTitle }))

    if (window.titleSaveTimeout) {
      clearTimeout(window.titleSaveTimeout)
    }

    window.titleSaveTimeout = setTimeout(() => {
      saveTitle(newTitle)
    }, 1000)
  }

  const formatText = (command, value = null) => {
    if (!editor) return

    const actions = {
      bold: () => editor.chain().focus().toggleBold().run(),
      italic: () => editor.chain().focus().toggleItalic().run(),
      strike: () => editor.chain().focus().toggleStrike().run(),
      code: () => editor.chain().focus().toggleCode().run(),
      h1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      h2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      h3: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      bulletList: () => editor.chain().focus().toggleBulletList().run(),
      orderedList: () => editor.chain().focus().toggleOrderedList().run(),
      codeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
      blockquote: () => editor.chain().focus().toggleBlockquote().run(),
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      // New actions
      underline: () => editor.chain().focus().toggleUnderline().run(),
      alignLeft: () => editor.chain().focus().setTextAlign('left').run(),
      alignCenter: () => editor.chain().focus().setTextAlign('center').run(),
      alignRight: () => editor.chain().focus().setTextAlign('right').run(),
      horizontalRule: () => editor.chain().focus().setHorizontalRule().run(),
      textColor: () => editor.chain().focus().setColor(value).run(),
      highlight: () => editor.chain().focus().toggleHighlight({ color: value }).run(),
      removeHighlight: () => editor.chain().focus().unsetHighlight().run(),
      removeColor: () => editor.chain().focus().unsetColor().run(),
      subscript: () => editor.chain().focus().toggleSubscript().run(),
      superscript: () => editor.chain().focus().toggleSuperscript().run(),
    }

    actions[command]?.()
  }

  const handleSummarize = () => {
    if (!editor) return

    if (!selectedText || selectedText.trim().length === 0) {
      alert("Please select some text first")
      return
    }
    if (selectedText.length > 5000) {
      alert("Please select less than 5000 characters")
      return
    }
    setShowSummaryModal(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading note...</p>
        </div>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">Note not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <button
              onClick={() => navigate('/dashboard')}
              className="text shadow border border-gray-100 px-2 py-1 rounded-l font-black-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
            >
              ← Back
            </button>
            <input
              type="text"
              value={note?.title || ''}
              onChange={handleTitleChange}
              className="text-m md:text-2xl md:font-bold border-none outline-none bg-transparent flex-1 min-w-0"
              placeholder="Untitled Note"
            />
            {saving && (
              <span className="text-sm text-gray-500 animate-pulse flex-shrink-0">
                Saving...
              </span>
            )}
          </div>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded ml-3 hover:bg-indigo-700"
          >
            <Share2 size={10} />
            Share
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-200 px-6 py-3 sticky top-16 bg-white z-10 shadow-sm">
        <div className="flex items-center space-x-1 flex-wrap gap-1 max-w-6xl mx-auto">
          {/* Text Formatting */}
          <button
            onClick={() => formatText('bold')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => formatText('italic')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          {/* NEW: Underline */}
          <button
            onClick={() => formatText('underline')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive('underline') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={16} />
          </button>
          <button
            onClick={() => formatText('strike')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive('strike') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
          {/* NEW: Subscript */}
          <button
            onClick={() => formatText('subscript')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive('subscript') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Subscript"
          >
            <SubscriptIcon size={16} />
          </button>
          {/* NEW: Superscript */}
          <button
            onClick={() => formatText('superscript')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive('superscript') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Superscript"
          >
            <SuperscriptIcon size={16} />
          </button>
          <button
            onClick={() => formatText('code')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 font-mono text-sm transition-colors disabled:opacity-50 ${
              editor?.isActive('code') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Inline Code"
          >
            {'</>'}
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* NEW: Text Color Picker */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTextColorPicker(!showTextColorPicker)
                setShowHighlightPicker(false)
              }}
              disabled={!editor}
              className="p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-1"
              title="Text Color"
            >
              <Palette size={16} />
              <span className="text-xs">▼</span>
            </button>
            {showTextColorPicker && (
              <div 
                className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {TEXT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        formatText('textColor', color)
                        setShowTextColorPicker(false)
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    formatText('removeColor')
                    setShowTextColorPicker(false)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 w-full text-center"
                >
                  Remove color
                </button>
              </div>
            )}
          </div>

          {/* NEW: Highlight Color Picker */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowHighlightPicker(!showHighlightPicker)
                setShowTextColorPicker(false)
              }}
              disabled={!editor}
              className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-1 ${
                editor?.isActive('highlight') ? 'bg-indigo-100 text-indigo-700' : ''
              }`}
              title="Highlight"
            >
              <Highlighter size={16} />
              <span className="text-xs">▼</span>
            </button>
            {showHighlightPicker && (
              <div 
                className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        formatText('highlight', color)
                        setShowHighlightPicker(false)
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    formatText('removeHighlight')
                    setShowHighlightPicker(false)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 w-full text-center"
                >
                  Remove highlight
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Headings */}
          <button
            onClick={() => formatText('h1')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 text-sm font-semibold transition-colors disabled:opacity-50 ${
              editor?.isActive('heading', { level: 1 }) ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => formatText('h2')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 text-sm font-semibold transition-colors disabled:opacity-50 ${
              editor?.isActive('heading', { level: 2 }) ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={() => formatText('h3')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 text-sm font-semibold transition-colors disabled:opacity-50 ${
              editor?.isActive('heading', { level: 3 }) ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Heading 3"
          >
            H3
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* NEW: Text Alignment */}
          <button
            onClick={() => formatText('alignLeft')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive({ textAlign: 'left' }) ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => formatText('alignCenter')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive({ textAlign: 'center' }) ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => formatText('alignRight')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive({ textAlign: 'right' }) ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Lists */}
          <button
            onClick={() => formatText('bulletList')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Bullet List"
          >
            • List
          </button>
          <button
            onClick={() => formatText('orderedList')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive('orderedList') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Numbered List"
          >
            1. List
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Blocks */}
          <button
            onClick={() => formatText('blockquote')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${
              editor?.isActive('blockquote') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Quote"
          >
            "
          </button>
          <button
            onClick={() => formatText('codeBlock')}
            disabled={!editor}
            className={`p-2 rounded hover:bg-gray-100 font-mono text-sm transition-colors disabled:opacity-50 ${
              editor?.isActive('codeBlock') ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            title="Code Block"
          >
            {'{ }'}
          </button>
          
          {/* NEW: Horizontal Rule */}
          <button
            onClick={() => formatText('horizontalRule')}
            disabled={!editor}
            className="p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Horizontal Line"
          >
            <Minus size={16} />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Summarize Button */}
          <button 
            onClick={handleSummarize}
            disabled={!editor || selectedText.trim().length === 0}
            className='flex items-center gap-1 px-3 py-2 bg-indigo-600
             text-white rounded hover:bg-indigo-700 transition 
             disabled:opacity-50 disabled:cursor-not-allowed'
            title='Summarize the selected text with AI'
          >
            <Sparkles size={16} />
            <span className='hidden sm:inline'>Summarize</span>
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 border border-gray-200 shadow-xl">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="flex justify-center items-center h-64">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p>Initializing collaborative editor...</p>
            </div>
          </div>
        )}
      </div>
      
      <ShareModal
        noteId={id}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      <SummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        noteId={id}
        selectedText={selectedText}
      />
    </div>
  )
}