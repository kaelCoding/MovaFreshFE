// Lô nguyên liệu mẫu cho trang truy xuất /q/:code. Hình dạng theo movafresh-platform/ai-engine/traceability-waze/README.md.
// Bản thật do xưởng ghi (P2A) vào db.lots qua api.ops.saveLot. Đây chỉ là dữ liệu mẫu để trang chạy được ngay; tên hợp tác xã là minh họa.
// Trường thêm so với README (xem docs/contract-changes.md): sku, kind, region, harvest_or_slaughter_timestamp,
// processed_timestamp, temperature_readings[], dish_ids[], sample.

export const SAMPLE_LOTS = [
  {
    qr_code: 'MOVA-TRACE-BO-202611-0912',
    kind: 'beef',
    sku: 'NL-BO-01',
    product_name: 'Thịt thăn bò ăn cỏ Đắk Lắk',
    sample: true,
    farm_info: {
      farm_name: 'Hợp tác xã Nông nghiệp Thảo Mộc Krông Năng',
      location: 'Krông Năng, Đắk Lắk',
      region: 'Cao nguyên Đắk Lắk',
      coordinates: '12.9845, 108.2341'
    },
    trust_score: 98.5,
    verifications: {
      mova_inspector: { verified: true, inspector_name: 'Trần Văn B (Cán bộ nguồn hàng)', antibiotic_test: 'NEGATIVE' },
      peer_validations_count: 8,
      last_peer_check: '2026-11-14T09:30:00Z'
    },
    harvest_or_slaughter_timestamp: '2026-11-14T22:30:00Z',
    processed_timestamp: '2026-11-15T03:00:00Z',
    slaughter_and_packing_timestamp: '2026-11-15T03:00:00Z',
    temperature_log: 'Duy trì liên tục 1.5°C - 3.2°C trong suốt hành trình xe lạnh về TP.HCM',
    temperature_readings: [
      { point: 'Sơ chế xong, vào kho lạnh xưởng', at: '2026-11-15T03:30:00Z', celsius: 1.5 },
      { point: 'Lên xe lạnh tại Đắk Lắk', at: '2026-11-15T09:00:00Z', celsius: 2.1 },
      { point: 'Giữa hành trình', at: '2026-11-15T15:00:00Z', celsius: 3.2 },
      { point: 'Tới kho phụ TP.HCM', at: '2026-11-15T20:00:00Z', celsius: 2.8 }
    ]
  },
  {
    qr_code: 'MOVA-TRACE-BO-202611-0913',
    kind: 'beef',
    sku: 'NL-BO-02',
    product_name: 'Thăn bò cắt steak, nuôi cỏ Tây Nguyên',
    sample: true,
    farm_info: {
      farm_name: "Trang trại bò cỏ Cư M'gar",
      location: "Cư M'gar, Đắk Lắk",
      region: 'Cao nguyên Đắk Lắk',
      coordinates: '12.8681, 108.0700'
    },
    trust_score: 96.2,
    verifications: {
      mova_inspector: { verified: true, inspector_name: 'Lê Thị C (Cán bộ nguồn hàng)', antibiotic_test: 'NEGATIVE' },
      peer_validations_count: 5,
      last_peer_check: '2026-11-13T08:10:00Z'
    },
    harvest_or_slaughter_timestamp: '2026-11-14T22:00:00Z',
    processed_timestamp: '2026-11-15T04:00:00Z',
    slaughter_and_packing_timestamp: '2026-11-15T04:00:00Z',
    temperature_log: 'Duy trì liên tục 1.8°C - 3.6°C trong suốt hành trình xe lạnh về TP.HCM',
    temperature_readings: [
      { point: 'Sơ chế xong, vào kho lạnh xưởng', at: '2026-11-15T04:30:00Z', celsius: 1.8 },
      { point: 'Lên xe lạnh tại Đắk Lắk', at: '2026-11-15T09:00:00Z', celsius: 2.4 },
      { point: 'Giữa hành trình', at: '2026-11-15T15:00:00Z', celsius: 3.6 },
      { point: 'Tới kho phụ TP.HCM', at: '2026-11-15T20:00:00Z', celsius: 3.0 }
    ]
  },
  {
    qr_code: 'MOVA-TRACE-GAO-202611-0207',
    kind: 'rice',
    sku: 'NL-GAO-01',
    product_name: 'Gạo hữu cơ ST25',
    sample: true,
    farm_info: {
      farm_name: 'Hợp tác xã Lúa gạo hữu cơ Ea Kar',
      location: 'Ea Kar, Đắk Lắk',
      region: 'Cao nguyên Đắk Lắk',
      coordinates: '12.8089, 108.4605'
    },
    trust_score: 97.1,
    verifications: {
      mova_inspector: { verified: true, inspector_name: 'Nguyễn Văn D (Cán bộ nguồn hàng)', antibiotic_test: 'NEGATIVE' },
      peer_validations_count: 11,
      last_peer_check: '2026-11-12T07:45:00Z'
    },
    harvest_or_slaughter_timestamp: '2026-10-28T01:00:00Z',
    processed_timestamp: '2026-11-10T02:00:00Z',
    slaughter_and_packing_timestamp: '2026-11-10T02:00:00Z',
    temperature_log: 'Gạo bảo quản ở nhiệt độ thường, kho khô thoáng, không cần chuỗi lạnh.',
    temperature_readings: []
  }
];
