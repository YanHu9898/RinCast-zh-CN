// Bakes a simplified-Chinese companion atlas for the headset UI.
//
// The upstream font atlas covers Latin-1 only: 412 glyphs, no hanzi at all. The
// renderer draws a character by looking it up in that atlas and skipping what it
// can't find, so Chinese text would silently lose every character.
//
// This tool writes `ui/text-zh.png` + `ui/text-zh.json` in the same format as
// tools/assetbaker, covering exactly the hanzi, punctuation and full-width forms
// that the translated UI actually uses. Keeping it to the characters in use holds
// the atlas near 1K instead of the ~16K a full CJK set would need.
//
//   bake-zh <font.ttf> <charset file> <out dir>
//
// The charset file is UTF-8 and holds every character to bake, plus printable
// ASCII so a mixed string ("USB 3", "90 Hz") renders without holes.
#define STB_TRUETYPE_IMPLEMENTATION
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include <algorithm>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <map>
#include <set>
#include <sstream>
#include <string>
#include <vector>

#include "nlohmann/json.hpp"
#include "stb/stb_image_write.h"
#include "stb/stb_truetype.h"

using nlohmann::json;

static std::vector<unsigned char> ReadFile(const std::string& path) {
    std::ifstream f(path, std::ios::binary);
    return std::vector<unsigned char>(std::istreambuf_iterator<char>(f), {});
}

struct Glyph {
    int key;
    int w, h;
    int xoff, yoff;
    float advance;
    std::vector<unsigned char> sdf;
    int x = 0, y = 0;
};

struct Atlas {
    int width = 0, height = 0;
    std::vector<unsigned char> pixels;
};

static bool Pack(std::vector<Glyph*>& glyphs, int width, int height) {
    std::sort(glyphs.begin(), glyphs.end(), [](Glyph* a, Glyph* b) { return a->h > b->h; });
    int x = 1, y = 1, shelf = 0;
    for (Glyph* g : glyphs) {
        if (x + g->w + 1 > width) {
            x = 1;
            y += shelf + 1;
            shelf = 0;
        }
        if (y + g->h + 1 > height) return false;
        g->x = x;
        g->y = y;
        x += g->w + 1;
        shelf = std::max(shelf, g->h);
    }
    return true;
}

// Splits UTF-8 into code points.
static std::vector<uint32_t> Codepoints(const std::string& s) {
    std::vector<uint32_t> out;
    for (size_t i = 0; i < s.size();) {
        const unsigned char c = static_cast<unsigned char>(s[i++]);
        uint32_t cp;
        int extra;
        if (c < 0x80) { cp = c; extra = 0; }
        else if ((c & 0xE0) == 0xC0) { cp = c & 0x1F; extra = 1; }
        else if ((c & 0xF0) == 0xE0) { cp = c & 0x0F; extra = 2; }
        else if ((c & 0xF8) == 0xF0) { cp = c & 0x07; extra = 3; }
        else continue;  // invalid lead byte
        while (extra-- > 0 && i < s.size()) cp = (cp << 6) | (static_cast<unsigned char>(s[i++]) & 0x3F);
        out.push_back(cp);
    }
    return out;
}

int main(int argc, char** argv) {
    if (argc < 4) {
        std::printf("usage: bake-zh <font file> <charset file> <out dir>\n");
        return 1;
    }
    const std::string fontPath = argv[1], charsetPath = argv[2], outDir = argv[3];

    // The headset draws at a 56 px bake size; keep that so metrics match.
    constexpr float kTextPx = 56.f;
    constexpr int kPad = 8;

    auto fontData = ReadFile(fontPath);
    if (fontData.empty()) {
        std::printf("can't read font %s\n", fontPath.c_str());
        return 1;
    }
    stbtt_fontinfo info;
    std::memset(&info, 0, sizeof(info));
    if (!stbtt_InitFont(&info, fontData.data(), stbtt_GetFontOffsetForIndex(fontData.data(), 0))) {
        std::printf("%s isn't a font stb_truetype can read\n", fontPath.c_str());
        return 1;
    }

    // Charset: what the UI uses, plus ASCII so Latin runs inside Chinese text work.
    std::set<uint32_t> wanted;
    for (int c = 32; c < 127; c++) wanted.insert(uint32_t(c));
    // Declared out here: `if (std::ifstream in(...))` reads as a function
    // declaration to MSVC (most vexing parse).
    std::ifstream charsetFile(charsetPath, std::ios::binary);
    if (!charsetFile) {
        std::printf("can't read charset %s\n", charsetPath.c_str());
        return 1;
    }
    {
        std::stringstream buf;
        buf << charsetFile.rdbuf();
        for (uint32_t cp : Codepoints(buf.str())) wanted.insert(cp);
    }
    // Drop newlines and the like: they are layout, not glyphs.
    for (uint32_t cp : {0x0Au, 0x0Du, 0x09u}) wanted.erase(cp);

    const float scale = stbtt_ScaleForPixelHeight(&info, kTextPx);
    int ascent, descent, gap;
    stbtt_GetFontVMetrics(&info, &ascent, &descent, &gap);

    std::vector<Glyph> glyphs;
    glyphs.reserve(wanted.size());
    int missing = 0;
    for (uint32_t cp : wanted) {
        if (!stbtt_FindGlyphIndex(&info, int(cp))) {
            missing++;
            continue;  // not in this font: the renderer will fall back
        }
        Glyph g{};
        g.key = int(cp);
        int advance, lsb;
        stbtt_GetCodepointHMetrics(&info, int(cp), &advance, &lsb);
        g.advance = advance * scale;
        unsigned char* sdf = stbtt_GetCodepointSDF(&info, scale, int(cp), kPad, 128, 128.f / kPad,
                                                   &g.w, &g.h, &g.xoff, &g.yoff);
        if (sdf) {
            g.sdf.assign(sdf, sdf + g.w * g.h);
            stbtt_FreeSDF(sdf, nullptr);
        }
        glyphs.push_back(std::move(g));
    }

    // Grow the atlas until everything fits. CJK at 56 px is far larger than Latin.
    std::vector<Glyph*> ptrs;
    for (auto& g : glyphs)
        if (!g.sdf.empty()) ptrs.push_back(&g);
    int size = 1024;
    while (!Pack(ptrs, size, size)) {
        size *= 2;
        if (size > 8192) {
            std::printf("atlas would exceed 8192x8192; trim the charset\n");
            return 1;
        }
    }

    std::vector<unsigned char> pixels(size_t(size) * size, 0);
    for (Glyph* g : ptrs)
        for (int y = 0; y < g->h; y++)
            std::copy_n(&g->sdf[size_t(y) * g->w], g->w, &pixels[size_t(g->y + y) * size + g->x]);

    const std::string png = outDir + "/text-zh.png";
    stbi_write_png(png.c_str(), size, size, 1, pixels.data(), size);
    std::printf("%s: %dx%d, %zu glyphs, %d not in font\n", png.c_str(), size, size, ptrs.size(), missing);

    json out{{"size", kTextPx},
             {"padding", kPad},
             {"faces", json::array()},
             {"glyphs", json::object()}};
    out["faces"].push_back({{"name", "NotoSansSC"},
                            {"ascent", ascent * scale},
                            {"descent", descent * scale},
                            {"lineGap", gap * scale},
                            {"kerning", json::object()}});
    for (const auto& g : glyphs) {
        if (g.sdf.empty()) continue;
        out["glyphs"][std::to_string(g.key)] = {g.x, g.y, g.w, g.h, g.xoff, g.yoff, g.advance};
    }
    std::ofstream(outDir + "/text-zh.json") << out.dump();
    std::printf("wrote %s/text-zh.json\n", outDir.c_str());
    return 0;
}
