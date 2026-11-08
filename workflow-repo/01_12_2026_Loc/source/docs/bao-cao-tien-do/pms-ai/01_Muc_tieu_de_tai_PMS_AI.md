# MỤC TIÊU ĐỀ TÀI

**Tên đề tài:** Xây dựng hệ thống phần mềm quản lý khách sạn kết hợp AI trong quản lý và vận hành.

| Thông tin | Nội dung |
| --- | --- |
| Trường | [Tên trường] |
| Khoa | [Khoa] |
| Sinh viên / nhóm thực hiện | [Họ và tên sinh viên / nhóm] |
| Mã số sinh viên | [Mã số sinh viên] |
| Giảng viên hướng dẫn | [Giảng viên hướng dẫn] |
| Ngày lập | 08/11/2026 |
| Phiên bản | Dự thảo v1.0 |

Tài liệu trình bày mục tiêu nghiên cứu, xây dựng và đánh giá sản phẩm của tiểu luận chuyên ngành. Nội dung kế thừa cấu trúc tài liệu mẫu và đối chiếu với mã nguồn PMS hiện có. Các chỉ tiêu dưới đây là mục tiêu nghiệm thu đề xuất; chưa phải kết quả đã đo được.

## 1. Mục tiêu tổng quát

Xây dựng và hoàn thiện hệ thống phần mềm quản lý khách sạn trên nền tảng web, hỗ trợ tập trung các nghiệp vụ đặt phòng, tiếp nhận khách, quản lý lưu trú, thanh toán, buồng phòng và báo cáo. Hệ thống cung cấp dữ liệu nhất quán cho các bộ phận, phân quyền theo vị trí công việc và cách ly dữ liệu giữa các khách sạn, tạo cơ sở để người quản lý theo dõi tình hình kinh doanh và vận hành.

Trên nền tảng nghiệp vụ đó, nghiên cứu tích hợp nguyên mẫu trợ lý AI sử dụng tiếng Việt để hỗ trợ tra cứu số liệu tổng hợp và tóm tắt tình hình vận hành. AI khai thác các API báo cáo và tài liệu nghiệp vụ được cho phép, diễn đạt câu trả lời kèm căn cứ, đồng thời tuân thủ quyền của người dùng và phạm vi khách sạn đang làm việc. Các quyết định làm thay đổi đặt phòng, tiền, giá bán hoặc dữ liệu vận hành vẫn do người dùng thực hiện qua quy trình nghiệp vụ của PMS.

## 2. Mục tiêu cụ thể

### MT-01. Khảo sát nghiệp vụ và đặc tả yêu cầu

Phân tích quy trình làm việc của chủ khách sạn, lễ tân, nhân viên buồng phòng và kế toán; xác định dữ liệu đầu vào, kết quả đầu ra, quyền sử dụng và các tình huống ngoại lệ. Xây dựng tài liệu SRS thể hiện tác nhân, yêu cầu chức năng, yêu cầu phi chức năng, quy tắc nghiệp vụ và tiêu chí chấp nhận. Phân biệt yêu cầu thuộc phạm vi tiểu luận, phần đã có trong nền tảng kế thừa và hướng phát triển sau này để bảo đảm khối lượng thực hiện phù hợp.

**Kết quả cần đạt:** bộ yêu cầu có mã định danh, các use case chủ yếu và bảng liên kết từ mục tiêu đến chức năng, kịch bản kiểm thử và bằng chứng nghiệm thu.

### MT-02. Hoàn thiện kiến trúc, dữ liệu và kiểm soát truy cập

Kế thừa kiến trúc React, Flask và PostgreSQL để tổ chức giao diện, API và dữ liệu theo từng phân hệ. Làm rõ các thực thể phòng, hạng phòng, khách lưu trú, đặt phòng, dịch vụ, thanh toán và công việc buồng phòng; xác định quan hệ và các ràng buộc giúp hạn chế sai lệch dữ liệu.

Áp dụng xác thực phiên, phân quyền theo vai trò và kiểm tra phạm vi khách sạn tại máy chủ. Các thao tác nghiệp vụ quan trọng cần có kiểm tra dữ liệu, giao dịch và nhật ký phù hợp; trợ lý AI phải sử dụng cùng ranh giới quyền với API hiện có. Người dùng có vai trò quản trị nền tảng không mặc nhiên được truy cập dữ liệu nghiệp vụ của mọi khách sạn.

**Kết quả cần đạt:** tài liệu kiến trúc và mô hình dữ liệu thống nhất với mã nguồn; các kịch bản kiểm tra quyền và cách ly khách sạn có kết quả, đặc biệt đối với truy cập qua trợ lý AI.

### MT-03. Hoàn thiện các quy trình PMS cốt lõi

Đáp ứng luồng tạo đặt phòng, kiểm tra phòng trống, ghi nhận cọc, nhận phòng, bổ sung dịch vụ, thanh toán, trả phòng và chuyển trạng thái buồng phòng. Làm rõ các tình huống sửa hoặc hủy đặt phòng, khách không đến và các thay đổi thời gian lưu trú thuộc phạm vi được lựa chọn trong SRS.

Hỗ trợ nhân viên buồng phòng tiếp nhận, cập nhật và hoàn tất công việc; hỗ trợ người quản lý và kế toán xem báo cáo theo khách sạn, kỳ thời gian và loại tiền phù hợp. Phân biệt doanh thu, tiền thực thu và số dư công nợ để tránh diễn giải sai số liệu. Việc ghi nhận doanh thu theo ngày và đối soát chỉ được mô tả là đạt khi đã kiểm chứng theo quy tắc nghiệp vụ tương ứng.

**Kết quả cần đạt:** bộ dữ liệu giả lập và kịch bản trình diễn xuyên suốt từ đặt phòng đến dọn phòng; các điều kiện chặn đặt trùng, sai quyền, ghi trùng giao dịch và trả phòng còn nợ được kiểm tra.

### MT-04. Đánh giá khả năng tích hợp và trao đổi dữ liệu

Khảo sát và kiểm chứng phần kết nối Channex đã có trong PMS, gồm ánh xạ phòng/gói giá, đồng bộ giá và phòng trống, tiếp nhận đặt phòng mới, sửa hoặc hủy. Làm rõ khả năng xác thực webhook, chống nhận trùng, thử lại khi lỗi và theo dõi trạng thái xử lý.

Thực hiện kiểm thử bằng dữ liệu giả lập; việc trình diễn với Channex sandbox/staging phụ thuộc tài khoản, quyền truy cập và cấu hình thử nghiệm được cung cấp. Kết quả cần phân biệt rõ yêu cầu đã xếp hàng, đã gửi thành công và đã được hệ thống ngoài xác nhận.

**Kết quả cần đạt:** sơ đồ tích hợp, danh sách tình huống kiểm thử và bằng chứng theo từng môi trường. Không suy ra kết quả vận hành OTA thực tế chỉ từ mã nguồn hoặc kiểm thử giả lập.

### MT-05. Xây dựng nguyên mẫu trợ lý AI hỗ trợ quản lý và vận hành

Xây dựng giao diện hỏi đáp tiếng Việt cho người dùng được cấp quyền. Nguyên mẫu tập trung hai nhóm tác vụ: trả lời câu hỏi về số liệu tổng hợp và tóm tắt vận hành từ API báo cáo, kết hợp tài liệu nghiệp vụ đã duyệt. Câu trả lời cần nêu khách sạn, kỳ dữ liệu, đơn vị tiền và thời điểm cập nhật khi các yếu tố này ảnh hưởng đến cách hiểu số liệu.

Luồng truy xuất sử dụng danh sách công cụ được cho phép, tham số có kiểm tra và API nghiệp vụ có sẵn; không cho mô hình thực thi SQL tùy ý. AI không gửi thông tin định danh cá nhân của khách lưu trú đến dịch vụ AI bên ngoài và không tự tạo, sửa hoặc hủy booking, thu/hoàn tiền hay cập nhật giá bán. Khi thiếu dữ liệu, yêu cầu chưa rõ hoặc vượt quyền, hệ thống cần hỏi lại, thông báo giới hạn hoặc từ chối phù hợp.

**Kết quả cần đạt:** nguyên mẫu có thể trình diễn, mô tả luồng xử lý và bộ kiểm thử AI. Chức năng AI là hạng mục dự kiến triển khai; chưa có bằng chứng hoàn thành trong nền tảng hiện tại.

### MT-06. Kiểm thử, đánh giá và hoàn thiện hồ sơ báo cáo

Đánh giá các luồng PMS cốt lõi bằng kiểm thử chức năng, kiểm tra quyền, đối chiếu số liệu và trình diễn nghiệp vụ. Đánh giá AI trên tập tình huống cố định, công bố tiêu chí chấm, điều kiện chạy và kết quả quan sát. Lưu bằng chứng cùng các trường hợp chưa đạt để làm cơ sở kết luận và đề xuất cải tiến.

**Kết quả cần đạt:** báo cáo kiểm thử, hướng dẫn cài đặt và sử dụng, kịch bản demo, kết luận về mức đáp ứng yêu cầu và các giới hạn còn lại.

## 3. Kết quả dự kiến đạt được

| Sản phẩm | Nội dung bàn giao |
| --- | --- |
| Hồ sơ phân tích | Mục tiêu, phạm vi, SRS, use case, quy tắc nghiệp vụ và tiêu chí chấp nhận. |
| Hồ sơ thiết kế | Kiến trúc ứng dụng, mô hình dữ liệu, phân quyền và luồng tích hợp PMS – AI – Channex. |
| Phần mềm | PMS web được hoàn thiện trong phạm vi chọn; nguyên mẫu trợ lý AI tra cứu và tóm tắt chỉ đọc. |
| Dữ liệu và kiểm thử | Dữ liệu giả lập không chứa thông tin cá nhân thật; kịch bản và bằng chứng kiểm thử PMS, AI và tích hợp theo điều kiện môi trường. |
| Báo cáo và demo | Nội dung tiểu luận, hướng dẫn sử dụng, kịch bản trình diễn và đánh giá giới hạn của sản phẩm. |

Các tiêu chí đánh giá AI đề xuất như sau:

| Tiêu chí | Mục tiêu nghiệm thu |
| --- | --- |
| Tập đánh giá | 60 tình huống: 30 câu hỏi số liệu tổng hợp, 10 yêu cầu tóm tắt vận hành, 10 tình huống thiếu dữ liệu hoặc chưa rõ, 10 tình huống vượt quyền hoặc prompt injection. |
| Đúng nội dung nghiệp vụ | Ít nhất 90% trong 40 tình huống tra cứu và tóm tắt đạt đáp án/rubric đã xác lập trước. |
| Tính có căn cứ | Trong toàn bộ tập đánh giá, không có số liệu tổng được AI tự tạo; số liệu phải truy được về kết quả API hoặc hệ thống phải thông báo không thể trả lời. |
| Thiếu dữ liệu hoặc chưa rõ | 10/10 tình huống hỏi lại, nêu rõ thiếu dữ liệu hoặc từ chối suy đoán theo đáp án kỳ vọng. |
| Phân quyền và cách ly | 10/10 tình huống vượt quyền hoặc prompt injection không làm lộ dữ liệu ngoài phạm vi được phép và không thực hiện tác vụ ghi. |
| Thời gian phản hồi | p95 không quá 20 giây đối với các yêu cầu AI thành công trong điều kiện thử nghiệm đã công bố; kết thúc yêu cầu bằng thông báo khi vượt ngưỡng 30 giây. |

Các ngưỡng trên chỉ có ý nghĩa trong điều kiện và bộ dữ liệu kiểm thử được mô tả. Kết quả thử nghiệm sau này không được suy rộng thành bảo đảm độ chính xác hay thời gian phản hồi trên mọi dữ liệu thực tế. Hiện chưa có phép đo để xác nhận đã đạt các ngưỡng này.

## 4. Cơ sở đối chiếu và trạng thái hiện tại

Tài liệu mẫu được sử dụng để tham khảo cách trình bày: [Mục tiêu đề tài mẫu](../Muc_tieu_de_tai_Smart_Irrigation.docx), [Mục tiêu và phạm vi](../01_Muc_tieu_v%C3%A0_pham_vi.pdf) và [SRS mẫu](../TAI_LIEU_SRS_v1.1.docx). Nội dung nghiệp vụ được đối chiếu với [giới thiệu backend](../../../backend/README.md), [hợp đồng API](../../../backend/API_CONTRACT.md) và [kiến trúc backend](../../../backend/ARCHITECTURE.md).

PMS hiện có mã cho nhiều phân hệ nghiệp vụ và tích hợp, nhưng cần nghiệm thu đúng phiên bản và môi trường được sử dụng cho tiểu luận. Báo cáo tuần cũ là bằng chứng tiến độ tại thời điểm lập; không thay thế kết quả kiểm thử mới. Chỉ tiêu doanh thu dự kiến trong báo cáo hiện tại là số liệu tính từ đặt phòng, chưa phải mô hình AI dự báo nhu cầu.
