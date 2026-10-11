"""Local graphify pipeline; semantic fragments are produced by the host agents."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'graphify-out'
SPEC = Path('C:/Users/Laptop/.codex/skills/graphify/references/extraction-spec.md')

def read(name):
    return json.loads((OUT / name).read_text(encoding='utf-8'))

def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding='utf-8')

mode = sys.argv[1]
if mode == 'detect':
    from graphify.detect import detect
    (OUT / '.graphify_python').write_text(sys.executable, encoding='utf-8')
    (OUT / '.graphify_root').write_text(str(ROOT), encoding='utf-8')
    d = detect(ROOT)
    write('.graphify_detect.json', d)
    print(json.dumps({k: v for k, v in d.items() if k != 'files'}, ensure_ascii=True))
    print('Counts:', {k: len(v) for k, v in d.get('files', {}).items()})
elif mode == 'ast':
    from graphify.extract import collect_files, extract
    files = []
    for f in read('.graphify_detect.json').get('files', {}).get('code', []):
        files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])
    result = extract(files, cache_root=ROOT) if files else {'nodes': [], 'edges': []}
    write('.graphify_ast.json', result)
    print('AST:', len(result['nodes']), 'nodes,', len(result['edges']), 'edges')
elif mode == 'cache':
    from graphify.cache import check_semantic_cache
    d = read('.graphify_detect.json')
    files = [f for cat in ('document', 'paper', 'image') for f in d['files'].get(cat, [])]
    nodes, edges, hyperedges, uncached = check_semantic_cache(files, root=str(ROOT), prompt_file=str(SPEC))
    write('.graphify_cached.json', {'nodes': nodes, 'edges': edges, 'hyperedges': hyperedges})
    (OUT / '.graphify_uncached.txt').write_text('\n'.join(uncached), encoding='utf-8')
    print('Cache hits:', len(files) - len(uncached), 'Uncached:', len(uncached))
    print('\n'.join(uncached))
elif mode == 'merge':
    from graphify.cache import save_semantic_cache
    new = read('.graphify_semantic_new.json')
    uncached = (OUT / '.graphify_uncached.txt').read_text(encoding='utf-8').splitlines()
    saved = save_semantic_cache(new['nodes'], new['edges'], new.get('hyperedges', []), root=str(ROOT), allowed_source_files=uncached, prompt_file=str(SPEC))
    cached = read('.graphify_cached.json')
    ast = read('.graphify_ast.json')
    nodes = list(ast['nodes'])
    seen = {n['id'] for n in nodes}
    for n in cached['nodes'] + new['nodes']:
        if n['id'] not in seen:
            seen.add(n['id'])
            nodes.append(n)
    result = {'nodes': nodes, 'edges': ast['edges'] + cached['edges'] + new['edges'], 'hyperedges': cached.get('hyperedges', []) + new.get('hyperedges', []), 'input_tokens': new.get('input_tokens', 0), 'output_tokens': new.get('output_tokens', 0), 'token_usage_unavailable': True}
    write('.graphify_extract.json', result)
    print('Cached:', saved, 'files. Merged:', len(nodes), 'nodes,', len(result['edges']), 'edges')
elif mode in ('build', 'label'):
    from graphify.build import build_from_json
    from graphify.cluster import cluster, score_all
    from graphify.analyze import god_nodes, surprising_connections, suggest_questions
    from graphify.report import generate
    from graphify.export import to_json
    from graphify.diagnostics import diagnose_extraction, format_diagnostic_report
    e = read('.graphify_extract.json')
    d = read('.graphify_detect.json')
    graph = build_from_json(e, root=str(ROOT), directed=False)
    if not graph.number_of_nodes():
        raise SystemExit('ERROR: Graph is empty')
    if mode == 'build':
        communities = cluster(graph)
        cohesion = score_all(graph, communities)
        gods = god_nodes(graph)
        surprises = surprising_connections(graph, communities)
        labels = {cid: 'Community ' + str(cid) for cid in communities}
    else:
        a = read('.graphify_analysis.json')
        communities = {int(k): v for k, v in a['communities'].items()}
        cohesion = {int(k): v for k, v in a['cohesion'].items()}
        gods, surprises = a['gods'], a['surprises']
        labels = {int(k): v for k, v in read('.graphify_labels.json').items()}
    questions = suggest_questions(graph, communities, labels)
    if not to_json(graph, communities, str(OUT / 'graph.json'), community_labels=labels):
        raise SystemExit('ERROR: Refused to shrink existing graph')
    tokens = {'input': e.get('input_tokens', 0), 'output': e.get('output_tokens', 0)}
    report = generate(graph, communities, cohesion, labels, gods, surprises, d, tokens, str(ROOT), suggested_questions=questions)
    if e.get('token_usage_unavailable'):
        report = report.replace('- Token cost: 0 input · 0 output', '- Token cost: unavailable (host agent usage is not exposed by the tool; counters in cost.json are placeholders, not zero cost).')
        report += '\n\nSemantic extraction used host agents; no external LLM API was called.\n'
    report += '\n\n## Extraction Limits\n- SVG assets were interpreted from their XML source, without rendering. The PNG asset was inspected visually.\n- CSS, the batch launcher and .gitignore were unclassified and are not represented in the graph.\n- Community cohesion and centrality are structural metrics; they do not establish implementation correctness.\n'
    (OUT / 'GRAPH_REPORT.md').write_text(report, encoding='utf-8')
    write('.graphify_analysis.json', {'communities': communities, 'cohesion': cohesion, 'gods': gods, 'surprises': surprises, 'questions': questions})
    health = diagnose_extraction(e, directed=False, root=str(ROOT))
    write('graph-health.json', health)
    with (OUT / 'GRAPH_REPORT.md').open('a', encoding='utf-8') as report_file:
        report_file.write(f"\n## Graph Health\n- {health.get('dangling_endpoint_edges', 0)} dangling-endpoint edges and {health.get('missing_endpoint_edges', 0)} missing-endpoint edges.\n- {health.get('undirected_same_endpoint_collapsed_edges', 0)} same-endpoint relations collapsed by the undirected graph builder.\n- Raw extraction is retained in extraction.json; full diagnostics are in graph-health.json.\n")
    print(format_diagnostic_report(health))
    print('Graph:', graph.number_of_nodes(), 'nodes,', graph.number_of_edges(), 'edges,', len(communities), 'communities')
    if mode == 'build':
        for cid, ids in communities.items():
            print(cid, ':', ', '.join(graph.nodes[i].get('label', i) for i in ids[:20]))
elif mode == 'finish':
    from datetime import datetime, timezone
    from graphify.detect import save_manifest
    from graphify.cli import _stamped_manifest_files
    d = read('.graphify_detect.json')
    e = read('.graphify_extract.json')
    corpus = d.get('all_files') or d['files']
    files = _stamped_manifest_files(corpus, e, ROOT)
    dispatched = {f for t, fl in d['files'].items() if t in ('document', 'paper', 'image') for f in fl}
    stamped = {f for fl in files.values() for f in fl}
    save_manifest(files, root=str(ROOT), scan_corpus={f for fl in corpus.values() for f in fl}, clear_semantic=dispatched - stamped or None)
    cost = read('cost.json') if (OUT / 'cost.json').exists() else {'runs': [], 'total_input_tokens': 0, 'total_output_tokens': 0}
    cost['runs'].append({'date': datetime.now(timezone.utc).isoformat(), 'input_tokens': e.get('input_tokens', 0), 'output_tokens': e.get('output_tokens', 0), 'files': d['total_files'], 'token_usage_available': False})
    cost['token_usage_note'] = 'Host agent token usage unavailable; counters are placeholders, not zero cost.'
    cost['total_input_tokens'] += e.get('input_tokens', 0)
    cost['total_output_tokens'] += e.get('output_tokens', 0)
    write('cost.json', cost)
    for pattern in ('.graphify_detect.json', '.graphify_extract.json', '.graphify_ast.json', '.graphify_semantic.json', '.graphify_analysis.json', '.graphify_cached.json', '.graphify_uncached.txt', '.graphify_semantic_new.json', '.graphify_chunk_*.json', '.needs_update'):
        for file in OUT.glob(pattern):
            file.unlink()
    print('Manifest and cost audit saved; temporary extraction files removed.')
