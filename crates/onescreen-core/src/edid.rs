//! Reading a monitor's serial number from its EDID (the identity block every
//! monitor reports over the cable).
//!
//! Identical monitor models at different desks only differ by serial, so this is
//! what lets OneScreen tell two hot desks apart (PRD M1).

/// The monitor's serial from a raw EDID block, or `None` if it doesn't report one.
///
/// Prefers the "display product serial number" text descriptor (tag 0xFF), which
/// is what's printed on the label. Falls back to the 32-bit serial in bytes
/// 12–15, ignoring the placeholders some panels ship with (0 and 0x01010101).
pub fn serial(edid: &[u8]) -> Option<String> {
    const HEADER: [u8; 8] = [0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00];
    if edid.len() < 128 || edid[..8] != HEADER {
        return None;
    }
    // four 18-byte descriptors at 54, 72, 90 and 108
    for start in [54usize, 72, 90, 108] {
        let d = &edid[start..start + 18];
        if d[0] == 0 && d[1] == 0 && d[2] == 0 && d[3] == 0xFF {
            let text: String = d[5..18]
                .iter()
                .take_while(|&&b| b != 0x0A && b != 0x00)
                .map(|&b| if b.is_ascii_graphic() || b == b' ' { b as char } else { '?' })
                .collect();
            let text = text.trim();
            if !text.is_empty() && !is_placeholder_text(text) {
                return Some(text.to_string());
            }
        }
    }
    let n = u32::from_le_bytes([edid[12], edid[13], edid[14], edid[15]]);
    (n != 0 && n != 0x0101_0101).then(|| format!("{n:08x}"))
}

/// Some panels fill the serial descriptor with zeros or a dummy value.
fn is_placeholder_text(s: &str) -> bool {
    s.chars().all(|c| c == '0' || c == ' ') || s.eq_ignore_ascii_case("serial") || s == "123456789"
}

#[cfg(test)]
mod tests {
    use super::*;

    fn edid(serial_num: u32, text: Option<&str>) -> Vec<u8> {
        let mut e = vec![0u8; 128];
        e[..8].copy_from_slice(&[0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00]);
        e[12..16].copy_from_slice(&serial_num.to_le_bytes());
        if let Some(t) = text {
            // put it in the second descriptor, like most monitors
            let d = &mut e[72..90];
            d[3] = 0xFF;
            let mut body = [0x20u8; 13];
            for (i, b) in t.bytes().take(13).enumerate() {
                body[i] = b;
            }
            if t.len() < 13 {
                body[t.len()] = 0x0A;
            }
            d[5..18].copy_from_slice(&body);
        }
        e
    }

    #[test]
    fn prefers_the_printed_serial() {
        assert_eq!(serial(&edid(0x1234, Some("CN0ABC123"))).as_deref(), Some("CN0ABC123"));
    }

    #[test]
    fn falls_back_to_the_numeric_serial() {
        assert_eq!(serial(&edid(0x00C0FFEE, None)).as_deref(), Some("00c0ffee"));
    }

    #[test]
    fn ignores_placeholders() {
        assert_eq!(serial(&edid(0, None)), None);
        assert_eq!(serial(&edid(0x0101_0101, None)), None);
        assert_eq!(serial(&edid(0, Some("0000000000000"))), None);
        // placeholder text, but a real numeric serial
        assert_eq!(serial(&edid(42, Some("0000000"))).as_deref(), Some("0000002a"));
    }

    #[test]
    fn rejects_garbage() {
        assert_eq!(serial(&[0u8; 128]), None);
        assert_eq!(serial(&[0x00, 0xFF]), None);
    }

    #[test]
    fn two_identical_models_get_different_identities() {
        let a = edid(0, Some("CN0ABC123"));
        let b = edid(0, Some("CN0ABC456"));
        assert_ne!(serial(&a), serial(&b));
    }
}
