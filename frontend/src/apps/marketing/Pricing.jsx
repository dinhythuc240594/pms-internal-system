import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronDown, Info } from 'lucide-react';
import { INITIAL_PRICING_PLANS } from '../../shared/config/pricingPlans';

const coreFeatures = [
  'Lịch đặt phòng và sơ đồ phòng',
  'Hồ sơ khách, nhận phòng và trả phòng',
  'Dịch vụ, cọc, thanh toán và hoàn tiền',
  'Trạng thái sạch, cần dọn và bảo trì',
  'Phân quyền cho đội ngũ khách sạn',
];
const questions = [
  ['LOHA có bao nhiêu gói?', 'LOHA có hai gói: Miễn Phí và Chuyên Nghiệp. Bảng giá này giúp bạn tham khảo trước khi trao đổi về nhu cầu và phạm vi triển khai của khách sạn.'],
  ['Giá theo năm được tính như thế nào?', 'Gói Chuyên Nghiệp có giá tham khảo 25.000.000đ cho một năm, so với 30.000.000đ khi trả 2.500.000đ mỗi tháng trong 12 tháng. Mức phí cuối cùng được xác nhận khi triển khai.'],
  ['Channel Manager và các tích hợp đã sẵn sàng chưa?', 'Kết nối OTA/Channel Manager và các tích hợp nâng cao đang nằm trong lộ trình phát triển. Hãy trao đổi để xác nhận tính năng sẵn sàng trước khi chọn gói; đây chưa phải tính năng đang hoạt động.'],
  ['Tôi bắt đầu từ đâu?', 'Bạn có thể xem trang Liên hệ để chuẩn bị nhu cầu triển khai. Nếu đã được cấp tài khoản khách sạn, chọn Mở LOHA để đăng nhập.'],
];

export default function Pricing() {
  const [cycle, setCycle] = useState('month');
  return (
    <>
      <section className="loha-page-intro">
        <div className="loha-container">
          <span className="loha-kicker">BẢNG GIÁ LOHA · HAI GÓI DỊCH VỤ</span>
          <h1>Chọn gói phù hợp.<br /><em>Vận hành theo cách của bạn.</em></h1>
          <p>Bắt đầu với những công việc cốt lõi, hoặc trao đổi về gói Chuyên Nghiệp theo nhu cầu của khách sạn. Giá dưới đây là mức tham khảo.</p>
        </div>
      </section>
      <section className="loha-price-section">
        <div className="loha-container">
          <div className="loha-price-top">
            <div className="loha-price-cycle" role="group" aria-label="Chu kỳ giá tham khảo">
              <button type="button" aria-pressed={cycle === 'month'} onClick={() => setCycle('month')}>Theo tháng</button>
              <button type="button" aria-pressed={cycle === 'year'} onClick={() => setCycle('year')}>Theo năm</button>
            </div>
            <p>Hai lựa chọn rõ ràng, cùng một mục tiêu: dành nhiều thời gian hơn cho khách.</p>
          </div>
          <div className="loha-price-grid" aria-live="polite">
            {INITIAL_PRICING_PLANS.map(plan => {
              const isPro = plan.code === 'PRO_PAID';
              const price = cycle === 'month' ? plan.priceMonth : plan.priceYear;
              return (
                <article key={plan.id} className={isPro ? 'loha-price-card loha-price-card-pro' : 'loha-price-card'}>
                  <div className="loha-price-card-top"><h2>{isPro ? 'Chuyên Nghiệp' : 'Miễn Phí'}</h2><span>{isPro ? 'PRO' : 'CORE PMS'}</span></div>
                  <p className="loha-price-description">{isPro ? 'Trao đổi về phương án triển khai và lộ trình mở rộng cho khách sạn của bạn.' : 'Một khởi đầu gọn gàng với những công việc vận hành khách sạn hằng ngày.'}</p>
                  <p className="loha-price-amount"><strong>{price.toLocaleString('vi-VN')}đ</strong><span>/ {cycle === 'month' ? 'tháng' : 'năm'}</span></p>
                  <p className="loha-price-period">{isPro ? cycle === 'year' ? 'Tham khảo: tiết kiệm 5.000.000đ so với 12 lần trả theo tháng.' : 'Giá tham khảo theo tháng.' : 'Không thu phí sử dụng theo bảng giá tham khảo.'}</p>
                  <Link className={isPro ? 'loha-button loha-button-light' : 'loha-button loha-button-primary'} to={isPro ? '/contact' : '/id/login'}>{isPro ? 'Trao đổi về gói' : 'Mở LOHA'}<ArrowUpRight size={18} aria-hidden="true" /></Link>
                  <div className="loha-price-includes">
                    <h3>{isPro ? 'Nền tảng vận hành cốt lõi' : 'Các công việc cốt lõi'}</h3>
                    <ul>{coreFeatures.map(feature => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}</ul>
                  </div>
                  {isPro && <p className="loha-price-roadmap"><strong>Lộ trình mở rộng</strong><br />OTA/Channel Manager và các tích hợp nâng cao đang được phát triển. Phạm vi sẵn sàng được xác nhận khi triển khai.</p>}
                </article>
              );
            })}
          </div>
          <div className="loha-price-note"><Info size={19} aria-hidden="true" /><p>Giá tham khảo theo cấu hình gói hiện có. Mức phí, giới hạn phòng/tài khoản và phạm vi tính năng được xác nhận khi triển khai. Chuyển chu kỳ ở đây chỉ để xem giá, chưa đăng ký hoặc thanh toán.</p></div>
        </div>
      </section>
      <section className="loha-section loha-faq">
        <div className="loha-container">
          <div className="loha-price-questions"><span className="loha-kicker">TRƯỚC KHI CHỌN GÓI</span><h2>Một vài điều cần biết.</h2>
            <div className="loha-faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
          </div>
        </div>
      </section>
    </>
  );
}
