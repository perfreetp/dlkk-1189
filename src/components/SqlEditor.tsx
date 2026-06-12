import { useEffect, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { autocompletion } from '@codemirror/autocomplete'
import { basicSetup } from 'codemirror'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const sqlDarkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#00d2ff' },
  { tag: tags.string, color: '#10b981' },
  { tag: tags.number, color: '#f59e0b' },
  { tag: tags.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: tags.variableName, color: '#e2e8f0' },
  { tag: tags.typeName, color: '#7c3aed' },
  { tag: tags.propertyName, color: '#94a3b8' },
])

interface SqlEditorProps {
  value: string
  onChange: (value: string) => void
  onExecute?: () => void
  readOnly?: boolean
  height?: string
  tables?: string[]
}

export default function SqlEditor({
  value,
  onChange,
  onExecute,
  readOnly = false,
  height = '100%',
  tables = [],
}: SqlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onExecuteRef = useRef(onExecute)

  onChangeRef.current = onChange
  onExecuteRef.current = onExecute

  useEffect(() => {
    if (!containerRef.current) return

    const executeKey = onExecute
      ? keymap.of([
          {
            key: 'Ctrl-Enter',
            run: () => {
              onExecuteRef.current?.()
              return true
            },
          },
        ])
      : []

    const keymaps = [...defaultKeymap, indentWithTab, ...(Array.isArray(executeKey) ? executeKey : [executeKey])]

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        sql({
          schema: tables.length > 0 ? Object.fromEntries(tables.map((t) => [t, []])) : undefined,
        }),
        oneDark,
        syntaxHighlighting(sqlDarkHighlight),
        highlightActiveLine(),
        keymap.of(keymaps),
        autocompletion(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
        EditorView.theme({
          '&': { height, fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto', fontFamily: "'JetBrains Mono', monospace" },
          '.cm-content': { caretColor: '#00d2ff' },
          '.cm-cursor': { borderLeftColor: '#00d2ff' },
          '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
            backgroundColor: 'rgba(0, 210, 255, 0.2) !important',
          },
          '.cm-gutters': { backgroundColor: '#0d1117', borderRight: '1px solid #1e293b' },
          '.cm-activeLineGutter': { backgroundColor: 'rgba(0, 210, 255, 0.08)' },
        }),
        EditorState.readOnly.of(readOnly),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [readOnly, height, tables.length > 0 ? tables.join(',') : ''])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-border-dark"
      style={{ height }}
    />
  )
}
