import SwiftUI

struct ScorekeeperRootView: View {
    @EnvironmentObject private var store: ScorekeeperStore

    var body: some View {
        Group {
            if store.match == nil {
                SetupView()
            } else {
                MatchTabsView()
            }
        }
        .tint(MGTTheme.brand)
        .alert("Scorekeeper", isPresented: alertBinding) {
            Button("OK", role: .cancel) {
                store.alertMessage = nil
            }
        } message: {
            Text(store.alertMessage ?? "")
        }
    }

    private var alertBinding: Binding<Bool> {
        Binding(
            get: { store.alertMessage != nil },
            set: { if !$0 { store.alertMessage = nil } }
        )
    }
}

private struct MatchTabsView: View {
    var body: some View {
        TabView {
            NavigationStack {
                RoundView()
            }
            .tabItem {
                Label("Score", systemImage: "pencil.and.list.clipboard")
            }

            NavigationStack {
                LedgerView()
            }
            .tabItem {
                Label("Ledger", systemImage: "list.bullet.rectangle")
            }

            NavigationStack {
                SettlementView()
            }
            .tabItem {
                Label("Settle", systemImage: "dollarsign.circle")
            }
        }
    }
}
