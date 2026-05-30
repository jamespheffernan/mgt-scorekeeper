import SwiftUI

@main
struct MGTScorekeeperApp: App {
    @StateObject private var store = ScorekeeperStore()

    var body: some Scene {
        WindowGroup {
            ScorekeeperRootView()
                .environmentObject(store)
        }
    }
}

