# Graph Report - pms-system  (2026-10-02)

## Corpus Check
- 75 files · ~96,227 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .css 1, .bat 1)

## Summary
- 412 nodes · 895 edges · 24 communities (19 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.86)
- Token cost: unavailable (host agent usage is not exposed by the tool; counters in cost.json are placeholders, not zero cost).

## Community Hubs (Navigation)
- Định tuyến và backoffice
- Đặt phòng dùng chung
- Thiết kế và demo
- Cấu hình frontend
- Cài đặt khách sạn
- Layout và buồng phòng
- Khuyến mãi
- Voucher
- Giá phòng
- Dịch vụ và POS
- Bộ biểu tượng SVG
- API Flask cơ bản
- Quy tắc lint
- Dashboard
- Kiểm kê kho
- Xuất kho
- Chuyển kho
- Khởi tạo Vite React
- Biểu tượng favicon
- Giá và phòng trống
- Minh họa hero
- Logo React
- Thư viện Flask CORS
- Logo Vite

## God Nodes (most connected - your core abstractions)
1. `react` - 58 edges
2. `lucide-react` - 45 edges
3. `App()` - 42 edges
4. `react-router-dom` - 24 edges
5. `getThemeTokens()` - 21 edges
6. `usePms()` - 21 edges
7. `today()` - 20 edges
8. `Settings()` - 20 edges
9. `nights()` - 19 edges
10. `PmsProvider()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Declared Flask 3.0.0 dependency` --semantically_similar_to--> `Planned Flask REST API core`  [INFERRED] [semantically similar]
  backend/requirements.txt → pms_system_design_final.md
- `Declared SQLAlchemy 2.0.21 dependency` --semantically_similar_to--> `Planned SQLAlchemy ORM`  [INFERRED] [semantically similar]
  backend/requirements.txt → pms_system_design_final.md
- `Demo booking creation and editing` --semantically_similar_to--> `Planned reservations table`  [INFERRED] [semantically similar]
  frontend/DEMO.md → pms_system_design_final.md
- `Demo shared booking state` --semantically_similar_to--> `Planned room_type_availabilities daily inventory`  [INFERRED] [semantically similar]
  frontend/DEMO.md → pms_system_design_final.md
- `Demo check-in and check-out rules` --semantically_similar_to--> `Planned Housekeeping module`  [INFERRED] [semantically similar]
  frontend/DEMO.md → pms_system_design_final.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Current demo booking and room lifecycle** — frontend_demo_shared_booking_state, frontend_demo_reservations, frontend_demo_checkin_checkout, frontend_demo_half_open_stays, frontend_demo_occupancy [EXTRACTED 1.00]
- **Planned CIA availability mechanisms** — pms_system_design_final_cia_triad, pms_system_design_final_redis, pms_system_design_final_read_write_replica, pms_system_design_final_pitr [EXTRACTED 1.00]
- **Planned tenant identity authorization and feature access** — pms_system_design_final_tenants, pms_system_design_final_users, pms_system_design_final_tenant_users, pms_system_design_final_rbac, pms_system_design_final_tenant_features, pms_system_design_final_feature_gating [EXTRACTED 1.00]

## Communities (24 total, 5 thin omitted)

### Community 0 - "Định tuyến và backoffice"
Cohesion: 0.06
Nodes (59): App(), AdminBilling(), ManagerHeader(), PAGE_TITLES, ManagerLayout(), ALL_NAV_ITEMS, ManagerSidebar(), AdminDashboard() (+51 more)

### Community 1 - "Đặt phòng dùng chung"
Cohesion: 0.08
Nodes (52): LegacyOverlay(), active(), addDays(), availableRooms(), initialRooms, money(), nights(), overlaps() (+44 more)

### Community 2 - "Thiết kế và demo"
Cohesion: 0.05
Nodes (36): Declared Flask 3.0.0 dependency, Declared SQLAlchemy 2.0.21 dependency, Current frontend PMS demo, Separate illustrative module data, bluejay-pms-demo-v1 localStorage persistence, Demo booking creation and editing, Demo warehouse receipts, Planned Alembic or Flask-Migrate (+28 more)

### Community 3 - "Cấu hình frontend"
Cohesion: 0.06
Nodes (34): dependencies, framer-motion, lucide-react, react, react-dom, react-is, react-router-dom, recharts (+26 more)

### Community 4 - "Cài đặt khách sạn"
Cohesion: 0.17
Nodes (26): AdvancedSecurity(), BedTypes(), BookingSources(), btnStyle(), BusinessPolicies(), BusinessProfile(), Commissions(), ExchangeRates() (+18 more)

### Community 5 - "Layout và buồng phòng"
Cohesion: 0.11
Nodes (16): activeTabStyle, badgeStyle, hkBadgeStyle, Housekeeping(), inactiveTabStyle, inputStyle, tdStyle, thStyle (+8 more)

### Community 6 - "Khuyến mãi"
Cohesion: 0.20
Nodes (8): badgeStyle, checkboxLabel, checkboxSubLabel, iconWrapperStyle, inputStyle, labelStyle, promotionCardStyle, thStyle

### Community 7 - "Voucher"
Cohesion: 0.20
Nodes (8): activeTabStyle, checkboxGroupStyle, checkboxLabel, inactiveTabStyle, inputStyle, labelStyle, tdStyle, thStyle

### Community 8 - "Giá phòng"
Cohesion: 0.22
Nodes (8): activeTabStyle, checkboxGroupStyle, checkboxLabel, inactiveTabStyle, inputStyle, labelStyle, tdStyle, thStyle

### Community 9 - "Dịch vụ và POS"
Cohesion: 0.25
Nodes (7): inputStyle, labelStyle, summaryLabelStyle, summaryRowStyle, summaryValueStyle, tdStyle, thStyle

### Community 10 - "Bộ biểu tượng SVG"
Cohesion: 0.29
Nodes (7): Bluesky icon, Discord icon, Documentation icon, GitHub icon, Social icon, SVG icon sprite, X icon

### Community 12 - "Quy tắc lint"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 13 - "Dashboard"
Cohesion: 0.60
Nodes (5): Dashboard(), ListContainer(), ListItem(), MetricCard(), TaskItem()

### Community 14 - "Kiểm kê kho"
Cohesion: 0.33
Nodes (5): filterLabelStyle, formLabelStyle, inputStyle, tdStyle, thStyle

### Community 15 - "Xuất kho"
Cohesion: 0.33
Nodes (5): filterLabelStyle, formLabelStyle, inputStyle, tdStyle, thStyle

### Community 16 - "Chuyển kho"
Cohesion: 0.33
Nodes (5): filterLabelStyle, formLabelStyle, inputStyle, tdStyle, thStyle

### Community 17 - "Khởi tạo Vite React"
Cohesion: 0.50
Nodes (3): pms-system HTML entry document, React template, Vite with HMR

### Community 18 - "Biểu tượng favicon"
Cohesion: 0.67
Nodes (3): Stylized lightning bolt glyph, Purple and blue blurred shading, SVG favicon

### Community 20 - "Minh họa hero"
Cohesion: 1.00
Nodes (3): Two stacked rounded diamond plates, Lower rounded diamond plate with textured purple sides, Upper rounded diamond plate with pale outline

## Knowledge Gaps
- **143 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 167 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Định tuyến và backoffice` to `Đặt phòng dùng chung`, `Cấu hình frontend`, `Cài đặt khách sạn`, `Layout và buồng phòng`, `Khuyến mãi`, `Voucher`, `Giá phòng`, `Dịch vụ và POS`, `Dashboard`, `Kiểm kê kho`, `Xuất kho`, `Chuyển kho`, `Giá và phòng trống`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Định tuyến và backoffice` to `Đặt phòng dùng chung`, `Cấu hình frontend`, `Cài đặt khách sạn`, `Layout và buồng phòng`, `Khuyến mãi`, `Voucher`, `Giá phòng`, `Dịch vụ và POS`, `Dashboard`, `Kiểm kê kho`, `Xuất kho`, `Chuyển kho`, `Giá và phòng trống`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `Định tuyến và backoffice` to `Giá phòng`, `Đặt phòng dùng chung`, `Cấu hình frontend`, `Layout và buồng phòng`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Định tuyến và backoffice` be split into smaller, more focused modules?**
  _Cohesion score 0.059278350515463915 - nodes in this community are weakly interconnected._
- **Should `Đặt phòng dùng chung` be split into smaller, more focused modules?**
  _Cohesion score 0.07885968159940762 - nodes in this community are weakly interconnected._
- **Should `Thiết kế và demo` be split into smaller, more focused modules?**
  _Cohesion score 0.05323653962492438 - nodes in this community are weakly interconnected._

Semantic extraction used host agents; no external LLM API was called.


## Extraction Limits
- SVG assets were interpreted from their XML source, without rendering. The PNG asset was inspected visually.
- CSS, the batch launcher and .gitignore were unclassified and are not represented in the graph.
- Community cohesion and centrality are structural metrics; they do not establish implementation correctness.

## Graph Health
- 4 dangling-endpoint edges and 0 missing-endpoint edges.
- 12 same-endpoint relations collapsed by the undirected graph builder.
- Raw extraction is retained in extraction.json; full diagnostics are in graph-health.json.
