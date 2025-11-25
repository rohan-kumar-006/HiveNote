import * as Y from 'yjs'
import Doc from '../models/doc.model.js'  

export async function loadYDocsState(docId) {
    const rec=await Doc.findById(docId);
    const ydoc= new Y.Doc();

    if(!rec){
        return ydoc;
    }

    if(rec.snapshot){
        Y.applyUpdate(ydoc,new Uint8Array(rec.snapshot))
    }
    for(const buf of rec.updates){
        Y.applyUpdate(ydoc,new Uint8Array(buf))
    }
    return ydoc;
}

export async function createSnapshotAndCompaction(docId) {
    const rec = await Doc.findById(docId)
    if (!rec) {
        return
    }
    
    const ydoc = await loadYDocsState(docId)
    const full = Y.encodeStateAsUpdate(ydoc)
    
    rec.snapshot = Buffer.from(full)
    rec.updates = [] 
    rec.version += 1
    await rec.save()
    
    ydoc.destroy()
}

//purpose of both the function
// 1️ loadYDocState(docId)
// Purpose:
//  To rebuild the full Yjs document from the database so you can continue working with it in memory.
// Process:
// Look up the database record (Doc) by its ID.
// Start with a blank Y.Doc (empty document).
// If a snapshot exists → apply it first (loads the bulk of the data quickly).
// Then apply each update (incremental changes) that happened after the snapshot.
// The result is the current, full document exactly as users left it.
// In short:
// “Take the saved snapshot + replay the updates to reconstruct the document.”

// 2️ createSnapshotAndCompaction(docId)
// Purpose:
//  To create a new snapshot (save the full current state) and clean up old updates to keep the database small.
// Process:
// Rebuild the full document (using loadYDocState).
// Encode that document into a single binary blob — a compact, complete state (encodeStateAsUpdate).
// Save that as the new snapshot.
// Clear the updates list (since it’s already included in the snapshot).
// Increase the version number to mark a new version.
// Save everything back to the DB.
// In short:
// “Compress all old changes into a new, single full save point.”