# -*- coding: utf-8 -*-
# Mo hinh chi phi AWS - Dong Doi. Gia ap-southeast-1 (Singapore), USD/thang.
# Gia tham chieu 2026-11. CAN KIEM CHUNG LAI bang AWS Pricing Calculator truoc khi cam ket.

def mo_hinh(dau, ten):
    # dau = so nguoi choi hoat dong hang ngay (DAU)
    phien_ngay = 1.3          # so phien/nguoi/ngay
    req_phien  = 45           # so request API moi phien (hanh dong + render)
    req_thang  = dau * phien_ngay * req_phien * 30

    # --- Compute: ECS Fargate ---
    # 1 task = 0.5 vCPU + 1GB. Gia: vCPU $0.04656/h, GB $0.00511/h
    if   dau <= 1000:  tasks = 2
    elif dau <= 10000: tasks = 3
    elif dau <= 50000: tasks = 6
    else:              tasks = 12
    fargate = tasks * (0.5*0.04656 + 1*0.00511) * 730

    # --- RDS PostgreSQL (Multi-AZ tu 10k DAU) ---
    if   dau <= 1000:  rds, rds_ten = 29.0,  "db.t4g.micro Single-AZ"
    elif dau <= 10000: rds, rds_ten = 116.0, "db.t4g.medium Multi-AZ"
    elif dau <= 50000: rds, rds_ten = 365.0, "db.m7g.large Multi-AZ"
    else:              rds, rds_ten = 730.0, "db.m7g.xlarge Multi-AZ"
    # Storage gp3. Tong tai khoan ~ 5x DAU. Moi tai khoan: ~3KB state + ~120KB
    # log su kien tich luy sau 1 nam choi. Day la TONG tich luy, khong phai moi thang.
    tai_khoan = dau * 5
    gb = max(20, tai_khoan * 0.000123 * 1024 / 1024)
    rds_sto = gb * 0.138

    # --- ElastiCache Redis (phien + AP timer + bang xep hang) ---
    if   dau <= 1000:  redis = 0.0      # chua can, dung in-memory
    elif dau <= 10000: redis = 49.0     # cache.t4g.micro x2
    elif dau <= 50000: redis = 197.0    # cache.t4g.medium x2
    else:              redis = 394.0

    # --- ALB ---
    alb_gio = 0.02555 * 730
    # LCU: uoc theo request/giay
    rps = req_thang / (30*24*3600)
    lcu = max(1, rps / 25)
    alb = alb_gio + lcu * 0.008 * 730

    # --- CloudFront + S3 (frontend tinh) ---
    gb_out = dau * phien_ngay * 30 * 0.8 / 1024   # ~0.8MB/phien sau cache
    cf = gb_out * 0.12 + (req_thang/10_000_000)*7.5
    s3 = 1.0

    # --- CloudWatch Logs ---
    log_gb = req_thang * 400 / 1e9     # ~400 byte/request
    cw = log_gb * 0.63 + 3.0

    # --- WAF ---
    waf = 8.0 + (req_thang/1_000_000)*0.60

    # --- Backup + NAT + Secrets ---
    nat = 0 if dau <= 1000 else 2 * (0.059*730 + 5)   # 2 AZ
    khac = 12.0

    tong = fargate+rds+rds_sto+redis+alb+cf+s3+cw+waf+nat+khac
    return dict(ten=ten, dau=dau, req=req_thang, tasks=tasks, rds_ten=rds_ten,
        rows=[("ECS Fargate (%d task)"%tasks,fargate),("RDS %s"%rds_ten,rds),
              ("RDS storage %.0fGB"%gb,rds_sto),("ElastiCache Redis",redis),
              ("ALB",alb),("CloudFront + S3",cf+s3),("CloudWatch Logs",cw),
              ("WAF",waf),("NAT Gateway",nat),("Backup/Secrets/khac",khac)],
        tong=tong)

for dau,ten in [(200,"Thu nghiem kin"),(2000,"Ra mat mem"),(20000,"Tang truong"),(100000,"Quy mo lon")]:
    m = mo_hinh(dau,ten)
    print("\n=== %s — %s DAU ===" % (m["ten"], format(m["dau"],",")))
    print("    %s request/thang" % format(int(m["req"]),","))
    for k,v in m["rows"]:
        if v > 0: print("    %-28s %8.2f" % (k,v))
    print("    %-28s %8.2f USD/thang" % ("TONG",m["tong"]))
    print("    %-28s %8.4f USD" % ("Chi phi / DAU",m["tong"]/m["dau"]))
