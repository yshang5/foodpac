package ca.foodpac.service;

import ca.foodpac.service.BrandSpecService.BrandSpec;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.AffineTransform;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/**
 * Renders brand mockups: draws a flat "printed label" panel from the brand
 * spec + form fields, then composites it onto each product photo at a
 * calibrated position/rotation. Pure Java2D — no native dependencies.
 */
@Slf4j
@Service
public class MockupRenderer {

    /** Showcase product: first product of each category. */
    public record Product(String id, String label, String cartType, String baseImage,
                          int cx, int cy, int w, int h, double rotationDeg) {}

    public static final List<Product> PRODUCTS = List.of(
            new Product("box-kraft",  "Kraft Takeout Box",     "BOX",     "prod-box-kraft.jpg",  500, 360, 300, 175, -8),
            new Product("cup-hot",    "Hot Drink Cup",         "CUP",     "prod-cup-hot.jpg",    400, 330, 250, 185,  0),
            new Product("bag-sm",     "Kraft Paper Bag",       "BAG",     "prod-bag-sm.jpg",     412, 350, 215, 160, -3),
            new Product("bowl-salad", "Salad & Grain Bowl",    "BOWL",    "prod-bowl-salad.jpg", 400, 400, 300, 135,  0),
            new Product("wrap-deli",  "Deli Wrap Paper",       "WRAP",    "prod-wrap-deli.jpg",  400, 430, 265, 130, -4),
            new Product("cut-set",    "Compostable Cutlery",   "CUTLERY", "prod-cut-set.jpg",    400, 300, 235, 145,  0)
    );

    /**
     * Composite the brand panel onto one product photo.
     * @return JPEG bytes of the finished mockup
     */
    public byte[] render(Product p, BrandSpec spec, byte[] logoBytes, String brandText,
                         String slogan, String address, String phone, byte[] qrBytes) throws IOException {
        BufferedImage base;
        try (InputStream in = getClass().getResourceAsStream("/mockups/" + p.baseImage())) {
            if (in == null) throw new IOException("Missing mockup base: " + p.baseImage());
            base = ImageIO.read(in);
        }

        // Render panel at 2x for crisp downscale
        BufferedImage panel = renderPanel(p.w() * 2, p.h() * 2, spec, logoBytes,
                brandText, slogan, address, phone, qrBytes);

        BufferedImage out = new BufferedImage(base.getWidth(), base.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(base, 0, 0, null);

        AffineTransform t = new AffineTransform();
        t.translate(p.cx(), p.cy());
        t.rotate(Math.toRadians(p.rotationDeg()));
        t.scale(0.5, 0.5);                       // panel was rendered at 2x
        t.translate(-panel.getWidth() / 2.0, -panel.getHeight() / 2.0);

        // Soft drop shadow for a "printed sticker" feel
        Graphics2D gs = (Graphics2D) g.create();
        gs.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.18f));
        AffineTransform ts = new AffineTransform(t);
        ts.preConcatenate(AffineTransform.getTranslateInstance(4, 6));
        gs.setColor(Color.BLACK);
        Shape shadow = ts.createTransformedShape(new RoundRectangle2D.Double(
                0, 0, panel.getWidth(), panel.getHeight(), 40, 40));
        gs.fill(shadow);
        gs.dispose();

        Graphics2D gp = (Graphics2D) g.create();
        gp.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.96f));
        gp.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        gp.setClip(t.createTransformedShape(new RoundRectangle2D.Double(
                0, 0, panel.getWidth(), panel.getHeight(), 40, 40)));
        gp.drawImage(panel, t, null);
        gp.dispose();
        g.dispose();

        var baos = new java.io.ByteArrayOutputStream();
        ImageIO.write(out, "jpg", baos);
        return baos.toByteArray();
    }

    /** Draw the flat label panel: brand block, slogan, contact line, QR. */
    private BufferedImage renderPanel(int w, int h, BrandSpec spec, byte[] logoBytes,
                                      String brandText, String slogan, String address,
                                      String phone, byte[] qrBytes) throws IOException {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        Color primary = Color.decode(spec.primary());
        Color secondary = Color.decode(spec.secondary());
        Color bg = Color.decode(spec.panelBg());
        Color text = Color.decode(spec.textColor());

        g.setColor(bg);
        g.fillRect(0, 0, w, h);
        // Accent bars top & bottom
        int bar = Math.max(8, h / 26);
        g.setColor(primary);
        g.fillRect(0, 0, w, bar);
        g.setColor(secondary);
        g.fillRect(0, h - bar, w, bar);

        int pad = w / 18;
        int contentTop = bar + pad / 2;
        boolean hasContact = notBlank(phone) || notBlank(address);
        int contactH = hasContact ? (int) (h * 0.14) : 0;
        int qrSize = qrBytes != null ? (int) (h * 0.30) : 0;

        // QR bottom-right
        if (qrBytes != null) {
            BufferedImage qr = ImageIO.read(new ByteArrayInputStream(qrBytes));
            if (qr != null) {
                int qx = w - pad - qrSize, qy = h - bar - pad / 2 - qrSize;
                g.setColor(Color.WHITE);
                g.fillRoundRect(qx - 6, qy - 6, qrSize + 12, qrSize + 12, 12, 12);
                g.drawImage(qr, qx, qy, qrSize, qrSize, null);
            }
        }

        // Brand block: logo image, else brand text
        int brandBottom = h - bar - contactH - pad / 2;
        int brandAreaW = qrBytes != null ? w - pad * 3 - qrSize : w - pad * 2;
        int brandAreaH = brandBottom - contentTop;
        boolean hasSlogan = notBlank(slogan);
        int sloganH = hasSlogan ? (int) (h * 0.14) : 0;

        if (logoBytes != null) {
            BufferedImage logo = ImageIO.read(new ByteArrayInputStream(logoBytes));
            if (logo != null) {
                int maxH = brandAreaH - sloganH;
                double s = Math.min((double) brandAreaW / logo.getWidth(), (double) maxH / logo.getHeight());
                int lw = (int) (logo.getWidth() * s), lh = (int) (logo.getHeight() * s);
                g.drawImage(logo, pad + (brandAreaW - lw) / 2, contentTop + (maxH - lh) / 2, lw, lh, null);
            }
        } else {
            String name = brandText == null ? "" : brandText.trim();
            int maxH = brandAreaH - sloganH;
            float size = maxH * 0.52f;
            Font f = new Font("DejaVu Sans", Font.BOLD, (int) size);
            FontMetrics fm = g.getFontMetrics(f);
            while (fm.stringWidth(name) > brandAreaW && size > 12) {
                size *= 0.92f; f = f.deriveFont(size); fm = g.getFontMetrics(f);
            }
            g.setFont(f);
            g.setColor(primary);
            int tx = pad + (brandAreaW - fm.stringWidth(name)) / 2;
            int ty = contentTop + (maxH + fm.getAscent() - fm.getDescent()) / 2;
            g.drawString(name, tx, ty);
        }

        if (hasSlogan) {
            Font f = new Font("DejaVu Sans", Font.ITALIC, (int) (sloganH * 0.55));
            FontMetrics fm = g.getFontMetrics(f);
            String s = slogan.trim();
            while (fm.stringWidth(s) > brandAreaW && f.getSize() > 10) {
                f = f.deriveFont((float) f.getSize() - 2); fm = g.getFontMetrics(f);
            }
            g.setFont(f);
            g.setColor(secondary);
            g.drawString(s, pad + (brandAreaW - fm.stringWidth(s)) / 2, brandBottom - fm.getDescent());
        }

        if (hasContact) {
            String line = String.join("  ·  ",
                    java.util.Arrays.stream(new String[]{phone, address})
                            .filter(MockupRenderer::notBlank).map(String::trim).toList());
            Font f = new Font("DejaVu Sans", Font.PLAIN, (int) (contactH * 0.42));
            FontMetrics fm = g.getFontMetrics(f);
            int availW = qrBytes != null ? w - pad * 3 - qrSize : w - pad * 2;
            while (fm.stringWidth(line) > availW && f.getSize() > 9) {
                f = f.deriveFont((float) f.getSize() - 1); fm = g.getFontMetrics(f);
            }
            g.setFont(f);
            g.setColor(text);
            g.drawString(line, pad + (availW - fm.stringWidth(line)) / 2,
                    h - bar - (contactH - fm.getAscent()) / 2 - fm.getDescent());
        }

        g.dispose();
        return img;
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }
}
