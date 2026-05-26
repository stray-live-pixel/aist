# Маленький разборщик YAML-frontmatter без внешних зависимостей.
# Поддерживает то, что реально нужно flow-файлам:
#   key: value                — строка или число
#   key: "value"              — строка в кавычках
#   key: |                    — многострочный блок markdown (с отступом 2 пробела)
#     line 1
#     line 2
#   key:                      — список с маркерами "  - item"
#     - item1
#     - item2
#   key:                      — список объектов
#     - subkey1: v1
#       subkey2: v2
#     - subkey1: v3
#       subkey2: v4
import re

_KV_RE = re.compile(r"^([A-Za-z_][\w-]*)\s*:\s*(.*)$")
# Для распознавания k:v внутри элементов списка требуем либо пробел после ":",
# либо пустое значение — иначе строки с двоеточием ("https://...", "foo:bar.txt")
# ошибочно парсятся как объект.
_OBJ_KV_RE = re.compile(r"^([A-Za-z_][\w-]*)\s*:(?:\s+(.*)|\s*$)")


def split_frontmatter(text):
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return None, text
    text_norm = text.replace("\r\n", "\n")
    end = text_norm.find("\n---\n", 4)
    if end < 0:
        if text_norm.endswith("\n---"):
            end = len(text_norm) - 4
        else:
            return None, text
    fm_text = text_norm[4:end]
    body_start = end + 5 if text_norm[end:end + 5] == "\n---\n" else end + 4
    body = text_norm[body_start:]
    return fm_text, body


def _coerce_scalar(raw):
    v = raw.strip()
    if not v:
        return ""
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        return v[1:-1]
    if v == "true":
        return True
    if v == "false":
        return False
    if v == "null" or v == "~":
        return None
    if v == "[]":
        return []
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    return v


def parse_frontmatter(text):
    """Возвращает (meta_dict, body_str). Если frontmatter отсутствует — meta == {}."""
    fm_text, body = split_frontmatter(text)
    if fm_text is None:
        return {}, body

    lines = fm_text.split("\n")
    meta = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            i += 1
            continue

        m = _KV_RE.match(line)
        if not m:
            i += 1
            continue

        key, val = m.group(1), m.group(2)

        # Многострочный markdown-блок: "key: |"
        if val.strip() in ("|", "|-", "|+"):
            block = []
            j = i + 1
            while j < len(lines):
                nl = lines[j]
                if nl.startswith("  "):
                    block.append(nl[2:])
                    j += 1
                elif nl.strip() == "":
                    block.append("")
                    j += 1
                else:
                    break
            # Уберём «висящие» пустые строки в конце
            while block and block[-1] == "":
                block.pop()
            meta[key] = "\n".join(block)
            i = j
            continue

        # Список: "key:" с последующими "  - item" или "  - subkey: ..." (объекты)
        if val.strip() == "":
            items = []
            j = i + 1
            while j < len(lines):
                nl = lines[j]
                if nl.strip() == "":
                    j += 1
                    continue
                if nl.startswith("  - "):
                    marker_len = 4
                    cont_indent = "    "  # 4 пробела для продолжения объекта
                elif nl.startswith("- "):
                    marker_len = 2
                    cont_indent = "  "
                else:
                    break

                after = nl[marker_len:]
                m_kv = _OBJ_KV_RE.match(after)
                if m_kv:
                    # Объектный элемент: первая пара ключ-значение сразу после маркера.
                    first_val = (m_kv.group(2) or "").strip()
                    obj = {m_kv.group(1): _coerce_scalar(first_val)}
                    block_indent = cont_indent + "  "
                    j += 1
                    while j < len(lines):
                        cl = lines[j]
                        if cl.strip() == "":
                            j += 1
                            continue
                        if not cl.startswith(cont_indent):
                            break
                        rest = cl[len(cont_indent):]
                        # Сиблинг-элемент (новый "- ...") или вложенный список — выходим.
                        if rest.startswith("- ") or rest.startswith(" "):
                            break
                        m_sub = _OBJ_KV_RE.match(rest)
                        if not m_sub:
                            break
                        sub_val = (m_sub.group(2) or "").strip()
                        # Многострочный блок `|` внутри объекта: тело идёт с отступом
                        # cont_indent + 2 пробела (стандарт YAML).
                        if sub_val in ("|", "|-", "|+"):
                            block = []
                            j += 1
                            while j < len(lines):
                                bl = lines[j]
                                if bl.startswith(block_indent):
                                    block.append(bl[len(block_indent):])
                                    j += 1
                                elif bl.strip() == "":
                                    block.append("")
                                    j += 1
                                else:
                                    break
                            while block and block[-1] == "":
                                block.pop()
                            obj[m_sub.group(1)] = "\n".join(block)
                            continue
                        obj[m_sub.group(1)] = _coerce_scalar(sub_val)
                        j += 1
                    items.append(obj)
                else:
                    item = after.strip()
                    if (item.startswith('"') and item.endswith('"')) or \
                       (item.startswith("'") and item.endswith("'")):
                        item = item[1:-1]
                    items.append(item)
                    j += 1
            if items:
                meta[key] = items
                i = j
                continue
            meta[key] = ""
            i += 1
            continue

        meta[key] = _coerce_scalar(val)
        i += 1

    return meta, body


if __name__ == "__main__":
    # Простая самопроверка.
    import json
    import sys
    txt = sys.stdin.read()
    meta, body = parse_frontmatter(txt)
    json.dump({"meta": meta, "body": body}, sys.stdout, ensure_ascii=False, indent=2)
