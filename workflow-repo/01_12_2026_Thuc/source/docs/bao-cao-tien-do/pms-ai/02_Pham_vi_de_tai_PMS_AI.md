# PHẠM VI THỰC HIỆN ĐỀ TÀI

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

## 1. Phạm vi tổng thể

Đề tài tập trung xây dựng và hoàn thiện ứng dụng web hỗ trợ quản lý, vận hành nội bộ khách sạn trên nền tảng PMS hiện có; đồng thời phát triển nguyên mẫu trợ lý AI hỗ trợ người dùng tra cứu số liệu tổng hợp và tóm tắt tình hình vận hành bằng tiếng Việt. Phạm vi nghiệm thu là môi trường phát triển hoặc trình diễn sử dụng dữ liệu giả lập. Nội dung chưa bao gồm triển khai kinh doanh trên môi trường sản xuất.

Đối tượng sử dụng trực tiếp gồm chủ khách sạn, lễ tân, nhân viên buồng phòng và kế toán. Quản trị viên nền tảng phụ trách cấu hình tài khoản, khách sạn và dịch vụ hệ thống trong phạm vi quản trị được cấp. Khách lưu trú là đối tượng được quản lý trong quy trình nghiệp vụ; cổng đặt phòng công khai hoặc chatbot phục vụ khách hàng bên ngoài không thuộc phạm vi nguyên mẫu AI của đề tài.

Hệ thống kế thừa khả năng quản lý nhiều khách sạn, nhưng dữ liệu nghiệp vụ và câu trả lời AI phải giới hạn trong khách sạn đang được chọn và quyền của người dùng. Các kịch bản kiểm thử sử dụng ít nhất hai khách sạn giả lập để đánh giá cách ly dữ liệu. Việc có chung nền tảng hoặc cùng một người dùng không đồng nghĩa được phép tổng hợp dữ liệu ngoài phạm vi đã cấp.

### 1.1. Mức độ ưu tiên thực hiện

| Nhóm phạm vi | Nội dung | Cách xác nhận |
| --- | --- | --- |
| Trọng tâm tiểu luận | PMS cốt lõi, phân quyền/cách ly, báo cáo; nguyên mẫu AI tra cứu và tóm tắt chỉ đọc. | Kiểm thử chức năng, đối chiếu dữ liệu và trình diễn xuyên suốt. |
| Tích hợp có điều kiện | Kiểm chứng Channex qua giả lập; demo sandbox/staging nếu có tài khoản và quyền thử nghiệm. | Công bố rõ môi trường, cấu hình thử và kết quả quan sát. |
| Phân hệ kế thừa bổ trợ | POS, kho, chính sách giá nâng cao, thuê bao SaaS và các công cụ quản trị đã có trong nền tảng. | Mô tả khả năng hiện có và kiểm tra phần trực tiếp ảnh hưởng đến demo; không cam kết mở rộng toàn bộ các phân hệ. |
| Hướng phát triển | Dự báo bằng học máy, tự động tối ưu giá, mobile và các tích hợp ngoài phạm vi. | Trình bày trong kiến nghị; không tính là sản phẩm bắt buộc. |

Mỗi chức năng được nghiệm thu theo yêu cầu và tiêu chí trong SRS. Trạng thái “có mã” chỉ xác nhận sự hiện diện của phần triển khai, chưa đồng nghĩa đã đạt nghiệm thu hoặc sẵn sàng vận hành thực tế.

## 2. Phạm vi chức năng

### 2.1. Tài khoản, vai trò và phạm vi khách sạn

Hệ thống hỗ trợ đăng nhập, đăng xuất, duy trì phiên và lựa chọn khách sạn mà tài khoản được phép truy cập. Backend kiểm tra quyền cho mỗi yêu cầu và áp dụng cách ly dữ liệu theo khách sạn; việc ẩn nút trên giao diện chỉ có vai trò hỗ trợ trải nghiệm.

| Tác nhân | Nghiệp vụ thuộc phạm vi |
| --- | --- |
| Chủ khách sạn | Quản lý cấu hình, nhân viên, phòng, đặt phòng và báo cáo trong khách sạn được cấp; sử dụng AI theo dữ liệu được phép xem. |
| Lễ tân | Theo dõi phòng và lịch đặt; quản lý đặt phòng, khách lưu trú, nhận/trả phòng, thu tiền và các công việc vận hành được cấp. |
| Nhân viên buồng phòng | Xem phòng và công việc; cập nhật tiến độ, tình trạng dọn và gửi kiểm tra theo phân quyền. |
| Kế toán | Xem số liệu tài chính, ghi nhận thu chi, đối soát và báo cáo theo quyền; sử dụng AI khi có quyền đối với nguồn dữ liệu tương ứng. |
| Quản trị nền tảng | Quản lý khách sạn, tài khoản hệ thống và cấu hình dịch vụ theo quyền quản trị. Muốn truy cập nghiệp vụ PMS phải có quyền khách sạn phù hợp. |

Tài khoản buồng phòng không được dùng AI để lấy báo cáo tài chính nếu không có quyền tương ứng. Nguyên mẫu không cung cấp chế độ AI có thể bỏ qua các ràng buộc quyền bằng chỉ dẫn ngôn ngữ tự nhiên.

Việc cấp, đổi hoặc thu hồi membership nhân viên PMS thuộc quyền Owner thông thường theo hợp đồng API. Tài khoản hệ thống không được thực hiện các thao tác này kể cả khi có membership Owner; quyền quản trị tenant và tài khoản nền tảng được kiểm tra riêng.

### 2.2. Danh mục và quản lý phòng

Phạm vi bao gồm thông tin khách sạn, hạng phòng, phòng thực tế, sức chứa, trạng thái sử dụng và tình trạng buồng phòng; các danh mục cần cho demo như nguồn đặt phòng, dịch vụ, phương thức thanh toán và quỹ. Hệ thống hỗ trợ xem tình trạng phòng theo thời gian để phục vụ tìm phòng trống và bố trí khách.

Dữ liệu phòng, giá và trạng thái được lưu trong PostgreSQL. Những thay đổi ảnh hưởng đến khả năng bán hoặc bố trí phòng phải được kiểm tra tại máy chủ. Phần trình diễn sử dụng danh mục đủ cho các tình huống đặt nhiều phòng, phòng bẩn, phòng bị khóa và khác hạng phòng.

### 2.3. Đặt phòng và quản lý lưu trú

Chức năng trọng tâm gồm tạo và xem đặt phòng, lựa chọn khách và phòng, ngày đến/ngày đi, lưu giá từng đêm, sửa hoặc hủy theo trạng thái cho phép, ghi nhận khách không đến, nhận phòng và trả phòng. Hệ thống cần kiểm tra khoảng ngày, sức chứa, khả năng phòng trống và các điều kiện chuyển trạng thái.

Luồng trình diễn chính là tạo booking → nhận cọc → nhận phòng → phát sinh dịch vụ → thanh toán → trả phòng → tạo hoặc cập nhật công việc dọn phòng. Phạm vi kiểm chứng còn bao gồm ngăn đặt trùng cùng phòng trong cùng thời gian, từ chối nhận phòng chưa đạt điều kiện và từ chối trả phòng khi còn nợ.

Nền tảng đã có luồng xem trước và xác nhận thay đổi khi đang lưu trú như chuyển phòng, gia hạn hoặc trả sớm. Các luồng này được mô tả theo quy tắc sẵn có, không tự suy diễn chính sách phí phạt hoặc tự cập nhật đặt phòng tại OTA. Kịch bản được chọn để nghiệm thu phải được ghi rõ trong SRS và báo cáo kiểm thử.

### 2.4. Dịch vụ, thanh toán và theo dõi thu chi

Phạm vi bao gồm thêm dịch vụ hoặc phụ thu vào booking, ghi nhận cọc và thanh toán, hoàn tiền theo quyền, theo dõi số còn phải thu và các chứng từ thu chi có liên quan đến luồng demo. Giá, loại tiền và tỷ giá đã lưu của giao dịch phải được tôn trọng khi tổng hợp hoặc đối chiếu số liệu.

PMS ghi nhận nghiệp vụ tiền do người có quyền thực hiện; không khởi tạo lệnh chuyển tiền ngân hàng. Việc thử lại yêu cầu thanh toán hoặc hoàn tiền không được làm phát sinh bản ghi tiền trùng. AI chỉ đọc số liệu tổng hợp từ API được phép, không thực hiện nghiệp vụ thu chi, sửa chứng từ hoặc đưa ra quyết định tài chính tự động.

POS và sổ quỹ là khả năng kế thừa. Đề tài sử dụng phần cần thiết để minh họa sự liên thông dữ liệu, không cam kết phát triển mới hệ thống kế toán đầy đủ, bảng lương hoặc quyết toán thuế.

### 2.5. Buồng phòng và hỗ trợ vận hành

Hệ thống hỗ trợ theo dõi phòng sạch/bẩn, công việc dọn phòng, phân công và cập nhật tiến độ. Khi khách trả phòng, dữ liệu tình trạng phòng và công việc dọn cần phản ánh đúng quy trình, hạn chế việc lễ tân bố trí khách vào phòng chưa sẵn sàng.

Phạm vi kiểm chứng gồm nhân viên nhận công việc, chuyển trạng thái đang làm/hoàn tất, gửi kiểm tra và người có quyền xác nhận sạch. Trợ lý AI có thể tóm tắt số phòng cần xử lý hoặc các công việc còn tồn nếu nguồn API hiện có và quyền người dùng cho phép; không tự phân ca hay giao việc.

### 2.6. Báo cáo, đối soát và dữ liệu cho AI

Đề tài khai thác Dashboard và báo cáo nghiệp vụ theo thời gian, gồm số đặt phòng, lượt đến/đi, số phòng đang sử dụng, tình trạng buồng phòng và số liệu tài chính theo quyền. Các chỉ tiêu cần nêu định nghĩa, kỳ dữ liệu và đơn vị tiền. Không gộp trực tiếp số tiền thuộc các loại tiền khác nhau.

Nền tảng đã có phân biệt doanh thu theo hóa đơn, doanh thu ghi nhận qua Night Audit và dòng tiền. Việc sử dụng chỉ tiêu nào phải nhất quán giữa giao diện báo cáo, công cụ AI và đáp án kiểm thử. Các điều kiện dữ liệu lịch sử hoặc ảnh chụp hiện tại cần được giữ trong phần diễn giải thay vì coi mọi báo cáo là tái hiện hoàn toàn lịch sử.

Cọc và công nợ trong snapshot báo cáo là số dư hiện tại tại thời điểm truy xuất, không phải số dư lịch sử theo kỳ. Trợ lý AI phải nêu đúng giới hạn này và thông báo chưa hỗ trợ nếu câu hỏi cần dữ liệu công nợ quá khứ mà API chưa cung cấp.

Trợ lý AI dùng API báo cáo làm nguồn số liệu chính thức. Nếu API chưa cung cấp chỉ tiêu, thiếu kỳ dữ liệu hoặc không thể kiểm tra quyền thì hệ thống phải thông báo giới hạn; mô hình không tự tính một kết quả bằng dữ liệu ngoài phạm vi được cấp.

### 2.7. Kết nối Channex và OTA

Phạm vi gồm mô tả và kiểm thử phần tích hợp đã có: cấu hình liên kết, ánh xạ hạng phòng/gói giá, đồng bộ giá và phòng trống, tiếp nhận booking mới/sửa/hủy, theo dõi hàng đợi và lịch sử xử lý. Kiểm thử cần đề cập xác thực webhook, chống trùng, revision đến sai thứ tự, retry và chỉ ACK sau khi dữ liệu cần thiết được lưu thành công.

Trường hợp lỗi đồng bộ, thiếu mapping hoặc dữ liệu tiền/thuế chưa đủ rõ cần được ghi nhận để người có quyền xử lý. Việc hiển thị đã xếp hàng không được diễn đạt thành đồng bộ thành công. Kịch bản có thể thực hiện bằng provider giả lập; demo Channex sandbox/staging chỉ được tính là hoàn thành khi có bằng chứng từ môi trường đó. Không thực hiện ghi OTA thật trên môi trường sản xuất trong phạm vi tiểu luận.

### 2.8. Nguyên mẫu trợ lý AI

Nguyên mẫu hỗ trợ tiếng Việt với hai nhóm chức năng:

1. **Tra cứu số liệu tổng hợp:** nhận câu hỏi, xác định khách sạn hiện hành, kỳ thời gian và loại chỉ tiêu; kiểm tra quyền; gọi công cụ đọc được cho phép; trả lời kèm căn cứ và giới hạn dữ liệu.
2. **Tóm tắt vận hành:** tổng hợp số liệu đã lấy từ API và tài liệu nghiệp vụ đã duyệt để trình bày tình hình đến/đi, phòng đang sử dụng, công việc cần theo dõi hoặc số liệu quản lý phù hợp với vai trò.

Ví dụ câu hỏi trong phạm vi là “Hôm nay có bao nhiêu đặt phòng đến và đi?” hoặc “Tóm tắt số phòng cần dọn trong ngày”. Câu hỏi “Doanh thu tuần này là bao nhiêu?” cần làm rõ cách hiểu chỉ tiêu nếu ngữ cảnh chưa xác định doanh thu hóa đơn, doanh thu ghi nhận hay thực thu. Câu trả lời phải thể hiện kỳ thời gian và loại tiền khi liên quan.

Luồng xử lý dự kiến là giao diện hội thoại → xác thực và xác định tenant/role → chọn công cụ cho phép → kiểm tra tham số → gọi API đọc theo quyền → tạo câu trả lời có căn cứ. Danh sách công cụ, loại tham số và nguồn tài liệu phải được kiểm soát ở phía máy chủ. Nguyên mẫu không cho phép mô hình chạy SQL tùy ý, truy cập trực tiếp toàn bộ database hoặc tùy chọn URL ngoài danh sách.

Không gửi tên, số điện thoại, email, số giấy tờ hoặc thông tin định danh cá nhân của khách đến dịch vụ AI bên ngoài. Không dùng dữ liệu khách thật làm dữ liệu trình diễn hay đánh giá. Prompt injection từ câu hỏi, tài liệu hoặc nội dung công cụ không được thay đổi quyền, lựa chọn tenant hoặc mở thêm tác vụ. Người dùng được thông báo rõ khi AI thiếu dữ liệu, không đủ quyền hoặc không thể tạo câu trả lời trong thời gian cho phép.

Nguyên mẫu AI chỉ đọc. Yêu cầu tạo/hủy booking, chuyển phòng, thu/hoàn tiền, chốt ngày, đổi giá hoặc giao việc phải được từ chối thực hiện qua AI; có thể hướng dẫn người dùng mở chức năng PMS phù hợp nếu có tài liệu được duyệt. Các tính năng học máy dự báo công suất, doanh thu hoặc tự động đề xuất giá tối ưu chưa thuộc phạm vi này.

## 3. Phạm vi kiểm thử và đánh giá

### 3.1. Kiểm thử PMS

Sử dụng dữ liệu giả lập để kiểm tra chức năng theo vai trò, hai khách sạn độc lập và luồng nghiệp vụ xuyên suốt. Đối chiếu dữ liệu ở giao diện với API và cơ sở dữ liệu thử nghiệm đối với các điểm cần chứng minh. Tập trung các tình huống có ảnh hưởng trực tiếp đến kết quả tiểu luận: đặt trùng, dữ liệu không hợp lệ, thao tác vượt quyền, tiền ghi trùng, phòng chưa sạch, booking còn nợ và thay đổi trạng thái không hợp lệ.

Đối với tích hợp, thực hiện kịch bản webhook lặp, revision cũ, lỗi nhà cung cấp và thử lại bằng giả lập; ghi riêng bằng chứng sandbox/staging nếu được cung cấp. Kết quả kiểm thử có sẵn từ các báo cáo trước chỉ là thông tin tham khảo tại phiên bản tương ứng. Các trường hợp bị bỏ qua vì thiếu PostgreSQL, credentials hoặc điều kiện môi trường phải được báo cáo đúng trạng thái, không tính là đạt.

### 3.2. Đánh giá AI

Tập đánh giá gồm 60 tình huống cố định, có dữ liệu đầu vào, tài khoản/vai trò, khách sạn, đáp án hoặc rubric và tiêu chí đạt được xác lập trước khi chạy:

| Nhóm tình huống | Số lượng | Tiêu chí mục tiêu |
| --- | ---: | --- |
| Câu hỏi số liệu tổng hợp | 30 | Đúng chỉ tiêu, kỳ, tenant, loại tiền và số liệu từ API; có căn cứ. |
| Tóm tắt vận hành | 10 | Diễn đạt đúng dữ liệu nguồn, nêu điểm cần theo dõi theo rubric, không suy diễn sự kiện chưa có. |
| Thiếu dữ liệu hoặc yêu cầu chưa rõ | 10 | 10/10 tình huống hỏi lại, nêu rõ giới hạn hoặc từ chối suy đoán theo đáp án kỳ vọng. |
| Vượt quyền hoặc prompt injection | 10 | 10/10 tình huống không lộ dữ liệu ngoài phạm vi, không thay đổi tenant/quyền và không thực hiện tác vụ ghi. |

Ít nhất 90% trong 40 tình huống tra cứu và tóm tắt phải đạt rubric. Trong toàn bộ tập đánh giá, số liệu tổng không được tự tạo; trường hợp không lấy được căn cứ cần trả lời rằng chưa đủ dữ liệu. Thời gian phản hồi thành công đặt mục tiêu p95 không quá 20 giây; yêu cầu vượt 30 giây phải kết thúc với thông báo phù hợp.

Kết quả thời gian cần ghi rõ môi trường, mô hình/dịch vụ AI, số lần chạy, kích thước dữ liệu, tỷ lệ thành công và điều kiện mạng. Các tỷ lệ và ngưỡng trên là mục tiêu đề xuất, chưa phải số liệu đã nghiệm thu và không khẳng định bảo đảm tuyệt đối ngoài tập đánh giá.

## 4. Các nội dung ngoài phạm vi

- Huấn luyện mô hình nền tảng, mô hình dự báo nhu cầu/công suất bằng học máy, dự báo tài chính hoặc tối ưu giá bán tự động.
- Cho phép AI tự sửa booking, điều chỉnh tồn phòng/giá, thu hoặc hoàn tiền, chốt sổ, phân ca hay giao việc.
- Cổng đặt phòng công khai, chatbot chăm sóc khách bên ngoài và nền tảng thương mại điện tử hoàn chỉnh.
- Ứng dụng mobile native, hoạt động ngoại tuyến và đồng bộ đa thiết bị ngoại tuyến.
- Cổng thanh toán ngân hàng tự động, hóa đơn điện tử theo cơ quan thuế và hệ thống kế toán tổng hợp đầy đủ.
- Khóa cửa thông minh, IoT, nhận dạng khuôn mặt, nhận dạng giấy tờ và các thiết bị phần cứng khách sạn.
- Tích hợp riêng từng OTA ngoài khả năng kết nối Channex được chọn; email/SMS/Zalo hoặc API đối tác chưa được xác định trong SRS.
- Triển khai production, di chuyển dữ liệu khách thật, vận hành có SLA thương mại hoặc chứng nhận tuân thủ pháp lý.
- Mở rộng mới toàn bộ phân hệ POS, kho, khuyến mãi nâng cao và kinh doanh thuê bao SaaS chỉ vì các phân hệ này đã có trong nền tảng.

## 5. Ràng buộc và điều kiện thực hiện

### 5.1. Công nghệ và mã nguồn kế thừa

Tiếp tục sử dụng React, Flask/Python và PostgreSQL theo cấu trúc dự án hiện tại. Chức năng mới cần tuân thủ các quy ước API, phân quyền, transaction, migration và tổ chức module đã có. Việc lựa chọn dịch vụ AI và cấu hình nguyên mẫu được thực hiện ở bước thiết kế; không coi nhà cung cấp hoặc phiên bản mô hình cụ thể là kết quả đã chốt trong báo cáo tiến độ này.

### 5.2. Dữ liệu và quyền riêng tư

Dữ liệu đánh giá và demo do nhóm tạo giả lập, không chứa thông tin cá nhân thật. Chỉ số được gửi đến AI phải được giới hạn ở dữ liệu tổng hợp cần cho câu hỏi và đã qua kiểm tra quyền. Khóa truy cập, thông tin kết nối và nội dung nhạy cảm không được đưa vào tài liệu bàn giao hoặc nhật ký hiển thị cho người dùng.

### 5.3. Môi trường và phụ thuộc bên ngoài

Kiểm thử nghiệp vụ cần môi trường PostgreSQL riêng. Kiểm chứng Channex sandbox/staging cần tài khoản, property, mapping và quyền thử nghiệm hợp lệ; kiểm chứng AI cần mô hình/dịch vụ hoạt động, cấu hình được phép và ngân sách thử nghiệm phù hợp. Thiếu điều kiện nào phải nêu rõ ảnh hưởng và bằng chứng thay thế, không tự suy ra kết quả của môi trường chưa chạy.

### 5.4. Giới hạn về thời gian và nghiệm thu

Khối lượng ưu tiên được giới hạn ở PMS cốt lõi và trợ lý AI chỉ đọc. Các yêu cầu bổ sung được đánh giá về dữ liệu, công sức và điều kiện kiểm chứng trước khi đưa vào SRS. Đề tài chỉ kết luận hoàn thành đối với các yêu cầu đã có bằng chứng phù hợp; phần mới có thiết kế hoặc có mã nhưng chưa kiểm thử được trình bày đúng trạng thái.

## 6. Cơ sở lập phạm vi

Hình thức tài liệu tham khảo [phạm vi đề tài mẫu](../Pham_vi_thuc_hien_Smart_Irrigation.docx), [mục tiêu và phạm vi](../01_Muc_tieu_v%C3%A0_pham_vi.pdf), [SRS mẫu](../TAI_LIEU_SRS_v1.1.docx). Phạm vi nghiệp vụ được đối chiếu với [giới thiệu backend](../../../backend/README.md), [hợp đồng API](../../../backend/API_CONTRACT.md), [kiến trúc backend](../../../backend/ARCHITECTURE.md) và [thiết kế PMS kế thừa](../../../pms_system_design_final.md).

Các tài liệu nguồn có thể mô tả những mốc triển khai khác nhau. Khi có khác biệt, cần đối chiếu phiên bản mã nguồn và bằng chứng kiểm thử tương ứng. Nguyên mẫu AI trong phạm vi này là yêu cầu đề xuất cho giai đoạn tiếp theo; chưa có căn cứ để báo cáo AI đã triển khai hoặc đạt các chỉ tiêu đánh giá.
