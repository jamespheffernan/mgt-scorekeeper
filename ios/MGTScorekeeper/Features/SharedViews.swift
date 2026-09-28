import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

enum MGTTheme {
    static let brand = Color(hex: 0x1A5E46)
    static let brandPressed = Color(hex: 0x154D3A)
    static let brandSoft = Color(hex: 0xE4EFE8)
    static let page = Color(hex: 0xF5F7FA)
    static let ink = Color(hex: 0x1A202C)
    static let muted = Color(hex: 0x4A5568)
    static let line = Color(hex: 0xCBD5E0)
    static let red = Color(hex: 0xD64533)
    static let blue = Color(hex: 0x2F80ED)
    static let success = Color(hex: 0x20C66C)
}

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

struct MGTScreen<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        ZStack {
            MGTTheme.page.ignoresSafeArea()
            content
        }
    }
}

struct MGTCard<Content: View>: View {
    var spacing: CGFloat = 12
    var horizontalPadding: CGFloat = 16
    var verticalPadding: CGFloat = 16
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, horizontalPadding)
        .padding(.vertical, verticalPadding)
        .background(.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(MGTTheme.line.opacity(0.35), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
    }
}

struct CompactPageHeader<Trailing: View>: View {
    let title: String
    var subtitle: String?
    private let trailing: Trailing

    init(title: String, subtitle: String? = nil, @ViewBuilder trailing: () -> Trailing) {
        self.title = title
        self.subtitle = subtitle
        self.trailing = trailing()
    }

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(MGTTheme.ink)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(MGTTheme.muted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)
                }
            }

            Spacer(minLength: 8)
            trailing
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.white)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(MGTTheme.line.opacity(0.55))
                .frame(height: 1)
        }
    }
}

extension CompactPageHeader where Trailing == EmptyView {
    init(title: String, subtitle: String? = nil) {
        self.init(title: title, subtitle: subtitle) {
            EmptyView()
        }
    }
}

struct MetricPill: View {
    let title: String
    let value: String
    var tint: Color = MGTTheme.brand

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2.weight(.medium))
                .foregroundStyle(MGTTheme.muted)
            Text(value)
                .font(.headline.monospacedDigit())
                .foregroundStyle(MGTTheme.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.78)
        }
        .frame(minWidth: 72, alignment: .leading)
        .padding(.vertical, 9)
        .padding(.horizontal, 10)
        .background(tint.opacity(0.10), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

struct TeamBadge: View {
    let team: Team

    var body: some View {
        Text(team.rawValue)
            .font(.caption.weight(.semibold))
            .foregroundStyle(team == .red ? MGTTheme.red : MGTTheme.blue)
            .padding(.horizontal, 9)
            .padding(.vertical, 4)
            .background((team == .red ? MGTTheme.red : MGTTheme.blue).opacity(0.12), in: Capsule())
    }
}

struct BigGameBadge: View {
    let value: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "leaf.fill")
                .font(.caption)
            Text(value)
                .font(.caption.weight(.bold).monospacedDigit())
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(MGTTheme.brand, in: Capsule())
    }
}

struct SaveToast: View {
    let message: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(MGTTheme.success)
            Text(message)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(MGTTheme.ink)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(.white, in: Capsule())
        .shadow(color: .black.opacity(0.16), radius: 14, x: 0, y: 6)
        .accessibilityElement(children: .combine)
    }
}

struct MGTPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(
                (isEnabled ? (configuration.isPressed ? MGTTheme.brandPressed : MGTTheme.brand) : MGTTheme.line),
                in: RoundedRectangle(cornerRadius: 12, style: .continuous)
            )
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

enum Haptics {
    @MainActor
    static func light() {
        #if canImport(UIKit)
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        #endif
    }

    @MainActor
    static func success() {
        #if canImport(UIKit)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        #endif
    }
}
