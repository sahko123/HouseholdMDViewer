use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{Emitter, State};
use notify::{Watcher, RecursiveMode, Event, EventKind};

struct OpenedFile(Mutex<Option<String>>);
struct FileWatcher(Mutex<Option<notify::RecommendedWatcher>>);

#[tauri::command]
fn get_opened_file(state: State<OpenedFile>) -> Option<String> {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
fn watch_file(
    path: String,
    app: tauri::AppHandle,
    watcher_state: State<FileWatcher>,
) -> Result<(), String> {
    let watch_path = PathBuf::from(&path);

    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        if let Ok(event) = res {
            match event.kind {
                EventKind::Modify(_) | EventKind::Create(_) => {
                    let _ = app.emit("file-changed", &path);
                }
                _ => {}
            }
        }
    }).map_err(|e| e.to_string())?;

    watcher.watch(&watch_path, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Store watcher so it doesn't get dropped
    *watcher_state.0.lock().unwrap() = Some(watcher);
    Ok(())
}

#[tauri::command]
fn unwatch_file(watcher_state: State<FileWatcher>) {
    *watcher_state.0.lock().unwrap() = None;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    let opened_file = if args.len() > 1 {
        Some(args[1].clone())
    } else {
        None
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(OpenedFile(Mutex::new(opened_file)))
        .manage(FileWatcher(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            get_opened_file, read_file, write_file, watch_file, unwatch_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
