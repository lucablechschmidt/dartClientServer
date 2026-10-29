//
//  DartApp.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI
import SwiftData
// Neu machen - testen für neues IOS
// Activity stack mit den würfen für einfacheres rückgängigmachen
@main
struct DartApp: App {
    @State private var selectedTab: Int = 1
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Player.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            HomeView()
        }
        .modelContainer(sharedModelContainer)
    }
}
